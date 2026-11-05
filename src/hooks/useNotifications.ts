import { useState, useEffect, useCallback, useRef } from 'react';
import { ToolType, Language } from '../types';

export interface AppNotification {
  id: string;
  tool: ToolType | 'system';
  title: string;
  titleKm: string;
  message: string;
  messageKm: string;
  timestamp: number;
  read: boolean;
  wasAway?: boolean;
  type?: 'complete' | 'away_alert' | 'info';
}

const NOTIFICATIONS_STORAGE_KEY = 'jonguse_notifications_v1';
const SOUND_ENABLED_KEY = 'jonguse_notif_sound_v1';
const AWAY_REMINDER_ENABLED_KEY = 'jonguse_away_reminder_v1';

const TOOL_LABELS: Record<string, { km: string; en: string }> = {
  srt: { km: 'បង្កើត Subtitle (.SRT)', en: 'Subtitle SRT Generator' },
  videostyle: { km: 'Style Subtitle លើវីដេអូ', en: 'Video Subtitle Styler' },
  ocr: { km: 'OCR អានអក្សររូបភាព', en: 'Document & Image OCR' },
  tts: { km: 'សំឡេងអាន Khmer TTS', en: 'Khmer TTS & Voice Clone' },
  qr: { km: 'បង្កើត QR Code ស្អាតៗ', en: 'Custom Styled QR Code' },
  download: { km: 'ទាញយកវីដេអូ (Downloader)', en: 'Social Video Downloader' },
  system: { km: 'ប្រព័ន្ធ ចង់ប្រើ (JongUse)', en: 'JongUse System' },
};

// Synthesize a crisp, pleasant mobile notification chime using Web Audio API
function playNotificationChime(variant: 'complete' | 'alert' = 'complete') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    if (variant === 'complete') {
      // Pleasant ascending two-note chime (C6 -> G6)
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880, now + 0.11); // A5
      osc2.frequency.setValueAtTime(1174.66, now + 0.11); // D6
    } else {
      // Gentle double-ping for away alert
      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.setValueAtTime(783.99, now + 0.12); // G5
      osc2.frequency.setValueAtTime(987.77, now + 0.12); // B5
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.11);
    osc1.stop(now + 0.46);
    osc2.stop(now + 0.46);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export function useNotifications(lang: Language, activeTab: string, onNavigateTool?: (tab: string) => void) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Currently visible mobile top drop-down banner
  const [activeDropDown, setActiveDropDown] = useState<AppNotification | null>(null);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SOUND_ENABLED_KEY);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [awayAlertEnabled, setAwayAlertEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(AWAY_REMINDER_ENABLED_KEY);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const dropDownTimeoutRef = useRef<any>(null);
  const pendingAwayQueueRef = useRef<AppNotification[]>([]);
  const titleIntervalRef = useRef<any>(null);
  const originalTitleRef = useRef<string>(
    typeof document !== 'undefined' ? document.title : 'ចង់ប្រើ (Jong Use)'
  );
  const lastAwayAlertTimeRef = useRef<number>(0);
  const awayTimerRef = useRef<any>(null);

  // Register Service Worker for mobile system push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('Service worker registration notice:', err));

      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK' && event.data.tool) {
          onNavigateTool?.(event.data.tool);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, [onNavigateTool]);

  // Save notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 40)));
    } catch {
      // ignore storage quota errors
    }
  }, [notifications]);

  // Save settings
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_ENABLED_KEY, JSON.stringify(next));
      } catch {}
      if (next) playNotificationChime('complete');
      return next;
    });
  }, []);

  const toggleAwayAlert = useCallback(() => {
    setAwayAlertEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AWAY_REMINDER_ENABLED_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Request Browser / Mobile OS Notification Permission
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') {
      setBrowserPermission('granted');
      return true;
    }
    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      return perm === 'granted';
    } catch {
      return false;
    }
  }, []);

  // Trigger Native Mobile / Browser System Notification
  const sendSystemPushNotification = useCallback(
    async (notif: AppNotification) => {
      if (typeof Notification === 'undefined') return;

      let perm = Notification.permission;
      if (perm === 'default') {
        try {
          perm = await Notification.requestPermission();
          setBrowserPermission(perm);
        } catch {
          // ignore
        }
      }

      if (perm !== 'granted') return;

      const title = lang === 'km' ? notif.titleKm : notif.title;
      const body = lang === 'km' ? notif.messageKm : notif.message;

      const options: any = {
        body,
        icon: '/icon-192.png',
        badge: '/favicon.png',
        tag: `jonguse-${notif.tool}-${Date.now()}`,
        vibrate: [160, 80, 160],
        data: { tool: notif.tool },
      };

      try {
        // Prefer ServiceWorker registration on Mobile Android/iOS PWA
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, options);
            return;
          }
        }
        // Fallback to standard desktop Notification constructor
        const sysNotif = new Notification(title, options);
        sysNotif.onclick = () => {
          window.focus();
          if (notif.tool && notif.tool !== 'system') {
            onNavigateTool?.(notif.tool);
          }
          sysNotif.close();
        };
      } catch (e) {
        console.warn('System notification fallback:', e);
      }
    },
    [lang, onNavigateTool]
  );

  // Trigger the In-App Mobile Top Drop-Down Banner
  const triggerMobileDropDown = useCallback(
    (notif: AppNotification, durationMs = 6000) => {
      if (dropDownTimeoutRef.current) {
        clearTimeout(dropDownTimeoutRef.current);
      }
      setActiveDropDown(notif);

      // Vibrate mobile device if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {}
      }

      if (soundEnabled) {
        playNotificationChime(notif.type === 'away_alert' ? 'alert' : 'complete');
      }

      dropDownTimeoutRef.current = setTimeout(() => {
        setActiveDropDown((current) => (current?.id === notif.id ? null : current));
      }, durationMs);
    },
    [soundEnabled]
  );

  // Dismiss current top drop-down banner
  const dismissDropDown = useCallback(() => {
    if (dropDownTimeoutRef.current) {
      clearTimeout(dropDownTimeoutRef.current);
    }
    setActiveDropDown(null);
  }, []);

  // Start flashing document title when user is not staying on page
  const startTitleAlert = useCallback((alertTextKm: string, alertTextEn: string) => {
    if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
    let toggle = false;
    titleIntervalRef.current = setInterval(() => {
      if (!document.hidden && document.hasFocus()) {
        clearInterval(titleIntervalRef.current);
        titleIntervalRef.current = null;
        document.title = originalTitleRef.current;
        return;
      }
      document.title = toggle
        ? `🔔 ${lang === 'km' ? alertTextKm : alertTextEn}`
        : originalTitleRef.current;
      toggle = !toggle;
    }, 1200);
  }, [lang]);

  // Listen for Page Visibility Changes (when user leaves page vs returns to page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.hidden;

      if (isHidden) {
        // User just left the page / minimized mobile browser / switched tab
        if (awayTimerRef.current) clearTimeout(awayTimerRef.current);

        // If user is on a tool page and awayAlertEnabled is true, set a gentle alert if they stay away
        if (awayAlertEnabled && activeTab !== 'home' && activeTab !== 'history') {
          const now = Date.now();
          // Avoid spamming if triggered within last 60 seconds
          if (now - lastAwayAlertTimeRef.current > 60000) {
            awayTimerRef.current = setTimeout(() => {
              if (document.hidden) {
                lastAwayAlertTimeRef.current = Date.now();
                const toolInfo = TOOL_LABELS[activeTab] || TOOL_LABELS.system;
                const awayNotif: AppNotification = {
                  id: 'away_' + Date.now(),
                  tool: (activeTab as ToolType) || 'system',
                  title: `${toolInfo.en} is Ready`,
                  titleKm: `ឧបករណ៍ ${toolInfo.km} កំពុងរង់ចាំអ្នក!`,
                  message: `You left the page while using ${toolInfo.en}. Tap to return to your workspace.`,
                  messageKm: `អ្នកបានចាកចេញពីទំព័រ ${toolInfo.km}។ ចុចទីនេះដើម្បីត្រឡប់មកធ្វើការបន្ត!`,
                  timestamp: Date.now(),
                  read: false,
                  wasAway: true,
                  type: 'away_alert',
                };

                setNotifications((prev) => [awayNotif, ...prev.slice(0, 39)]);
                pendingAwayQueueRef.current.push(awayNotif);
                sendSystemPushNotification(awayNotif);
                startTitleAlert('ត្រឡប់មកទំព័រការងារវិញ!', 'Return to your workspace!');
              }
            }, 8000); // Send mobile notification 8 seconds after user leaves the active tool page
          }
        }
      } else {
        // User returned to the page!
        if (awayTimerRef.current) {
          clearTimeout(awayTimerRef.current);
          awayTimerRef.current = null;
        }
        if (titleIntervalRef.current) {
          clearInterval(titleIntervalRef.current);
          titleIntervalRef.current = null;
        }
        document.title = originalTitleRef.current;

        // If any tool completed or alerted while user was away, immediately drop down the mobile banner!
        if (pendingAwayQueueRef.current.length > 0) {
          const latestAwayNotif = pendingAwayQueueRef.current[0];
          pendingAwayQueueRef.current = [];
          triggerMobileDropDown(latestAwayNotif, 7000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
    };
  }, [activeTab, awayAlertEnabled, sendSystemPushNotification, startTitleAlert, triggerMobileDropDown]);

  // Main function called whenever any tool feature completes or is done
  const notifyToolComplete = useCallback(
    (
      tool: ToolType | 'system',
      customTitle: string,
      customSummary?: string,
      options?: { titleKm?: string; messageKm?: string }
    ) => {
      const toolLabel = TOOL_LABELS[tool] || TOOL_LABELS.system;
      const isUserAway = typeof document !== 'undefined' && (document.hidden || !document.hasFocus());

      const titleKm =
        options?.titleKm ||
        `✅ ${toolLabel.km} — រួចរាល់ហើយ!`;
      const titleEn = `✅ ${toolLabel.en} — Completed!`;

      const messageKm =
        options?.messageKm ||
        (customSummary
          ? `${customTitle} • ${customSummary}`
          : `មុខងារ "${customTitle}" ត្រូវបានដំណើរការរួចរាល់ដោយជោគជ័យ!`);
      const messageEn = customSummary
        ? `${customTitle} • ${customSummary}`
        : `"${customTitle}" has finished processing successfully!`;

      const newNotif: AppNotification = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        tool,
        title: titleEn,
        titleKm,
        message: messageEn,
        messageKm,
        timestamp: Date.now(),
        read: false,
        wasAway: isUserAway,
        type: 'complete',
      };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 39)]);

      // Always show the sleek mobile top drop-down banner right away
      triggerMobileDropDown(newNotif, 6500);

      // If user is NOT staying on the page (hidden tab, minimized browser, or unfocused window)
      // OR if they have granted system push notifications on mobile:
      if (isUserAway) {
        pendingAwayQueueRef.current.unshift(newNotif);
        sendSystemPushNotification(newNotif);
        startTitleAlert(`${toolLabel.km} រួចរាល់!`, `${toolLabel.en} Done!`);
      } else if (browserPermission === 'granted') {
        // Also fire system notification if user enabled mobile push notifications
        sendSystemPushNotification(newNotif);
      }
    },
    [browserPermission, sendSystemPushNotification, startTitleAlert, triggerMobileDropDown]
  );

  // Send a test mobile drop-down + push notification so user can preview it immediately
  const sendTestNotification = useCallback(async () => {
    await requestPushPermission();
    const testNotif: AppNotification = {
      id: 'test_' + Date.now(),
      tool: (activeTab !== 'home' && activeTab !== 'history' ? (activeTab as ToolType) : 'srt'),
      title: '✅ Mobile Drop-Down Alert Ready!',
      titleKm: '✅ ការជូនដំណឹងលើទូរស័ព្ទដំណើរការជោគជ័យ!',
      message: 'You will receive this top drop-down alert whenever a tool finishes or when you leave the page.',
      messageKm: 'អ្នកនឹងទទួលបានសារធ្លាក់ពីលើអេក្រង់បែបនេះ នៅពេលឧបករណ៍នីមួយៗដំណើរការរួចរាល់ ឬពេលអ្នកមិននៅលើទំព័រ!',
      timestamp: Date.now(),
      read: false,
      wasAway: false,
      type: 'complete',
    };

    setNotifications((prev) => [testNotif, ...prev.slice(0, 39)]);
    triggerMobileDropDown(testNotif, 6500);
    sendSystemPushNotification(testNotif);
  }, [activeTab, requestPushPermission, sendSystemPushNotification, triggerMobileDropDown]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    activeDropDown,
    dismissDropDown,
    notifyToolComplete,
    sendTestNotification,
    markAllAsRead,
    markAsRead,
    clearNotifications,
    soundEnabled,
    toggleSound,
    awayAlertEnabled,
    toggleAwayAlert,
    browserPermission,
    requestPushPermission,
  };
}
