import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { DashboardPage } from './pages/DashboardPage';
import { useUsageLog } from './hooks/useUsageLog';
import { useUserAccount } from './hooks/useUserAccount';
import { useToast } from './hooks/useToast';
import { useNotifications } from './hooks/useNotifications';
import { MobileNotificationBanner } from './components/ui/MobileNotificationBanner';
import { Language, ToolType } from './types';
import { subscribeToAuth, logoutUser } from './firebase';
import { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { SubscriptionModal } from './components/subscription/SubscriptionModal';
import { TokenUsageModal } from './components/subscription/TokenUsageModal';
import { TokenDepletedModal } from './components/subscription/TokenDepletedModal';
import { GoogleAuthModal } from './components/auth/GoogleAuthModal';

export default function App() {
  const [lang, setLang] = useState<Language>('km');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [user, setUser] = useState<User | null>(null);
  const initialRedirectDone = useRef<boolean>(false);
  const lastLogNotificationTimeRef = useRef<number>(0);

  // Modals state
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState<boolean>(false);
  const [usageModalOpen, setUsageModalOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [tokenDepletedModal, setTokenDepletedModal] = useState<{
    isOpen: boolean;
    requiredTokens: number;
    toolName?: string;
  }>({
    isOpen: false,
    requiredTokens: 10,
    toolName: '',
  });

  const { logs, logActivity, clearHistory } = useUsageLog();
  const { toasts, showToast, removeToast } = useToast();

  // Mobile Top Drop-Down & Background/Away Page Notifications
  const {
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
  } = useNotifications(lang, activeTab, (toolTab) => {
    setActiveTab(toolTab);
  });

  // Wrap logActivity so every completed tool feature triggers the Mobile Top Drop-Down & Background Notification
  const handleLogActivity = useCallback(
    (tool: ToolType, title: string, summary?: string, previewUrl?: string) => {
      logActivity(tool, title, summary, previewUrl);
      lastLogNotificationTimeRef.current = Date.now();
      notifyToolComplete(tool, title, summary);
    },
    [logActivity, notifyToolComplete]
  );

  // Wrap showToast so sub-feature completions also trigger the Mobile Top Drop-Down Banner if not already triggered by logActivity
  const handleShowToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const timeSinceLastToolNotif = Date.now() - lastLogNotificationTimeRef.current;
      if (type === 'error') {
        showToast(message, type);
        return;
      }

      // If a tool completion notification wasn't just triggered within 800ms, show this sub-feature completion as a mobile drop-down alert
      if (timeSinceLastToolNotif > 800) {
        const currentTool: ToolType | 'system' =
          activeTab !== 'home' && activeTab !== 'history' ? (activeTab as ToolType) : 'system';
        notifyToolComplete(currentTool, message, undefined, {
          titleKm: '✅ ដំណើរការរួចរាល់ (Completed)',
          messageKm: message,
        });
      }
    },
    [activeTab, notifyToolComplete, showToast]
  );

  // Integrated User Account & Token System
  const {
    account,
    tokens,
    plan,
    deductTokens,
    subscribeToPlan,
    refillTokens,
    tokenLogs,
    hasEnoughTokens,
  } = useUserAccount(user);

  useEffect(() => {
    // Listen to Firebase auth state
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);

      // Auto-redirect to dashboard when user is logged in with Google on initial load
      if (currentUser && !currentUser.isAnonymous && !initialRedirectDone.current) {
        initialRedirectDone.current = true;
        setActiveTab('srt');
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync html lang
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      handleShowToast(lang === 'km' ? 'បានចាកចេញពីគណនីជោគជ័យ' : 'Signed out successfully', 'success');
      setActiveTab('home');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleOpenTokenDepleted = (requiredTokens: number, toolName: string) => {
    setTokenDepletedModal({
      isOpen: true,
      requiredTokens,
      toolName,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-emerald-500 selection:text-white">
      {/* Mobile Top Drop-Down Notification Banner (iOS/Android Push Style) */}
      <MobileNotificationBanner
        notification={activeDropDown}
        lang={lang}
        onDismiss={dismissDropDown}
        onOpenTool={(tool) => setActiveTab(tool)}
      />

      {/* Error / Fallback Toast container (top-down on mobile) */}
      <div className="fixed top-16 sm:top-auto sm:bottom-4 right-3 sm:right-4 left-3 sm:left-auto z-50 flex flex-col gap-2 sm:max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-3.5 rounded-2xl shadow-lg border pointer-events-auto flex items-center justify-between gap-3 text-xs font-semibold ${
                t.type === 'error'
                  ? 'bg-red-950 text-red-100 border-red-800'
                  : 'bg-stone-900 text-white border-stone-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {t.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Header with Notification Bell Drop-Down, Account Avatar, Language Toggle */}
      <Navbar
        currentLang={lang}
        onLanguageChange={setLang}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        tokens={tokens}
        plan={plan}
        user={user}
        onOpenSubscription={() => setSubscriptionModalOpen(true)}
        onOpenUsageModal={() => setUsageModalOpen(true)}
        onOpenLogin={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        notifications={notifications}
        unreadCount={unreadCount}
        soundEnabled={soundEnabled}
        awayAlertEnabled={awayAlertEnabled}
        browserPermission={browserPermission}
        onToggleSound={toggleSound}
        onToggleAwayAlert={toggleAwayAlert}
        onRequestPushPermission={requestPushPermission}
        onSendTestNotification={sendTestNotification}
        onMarkAllAsRead={markAllAsRead}
        onMarkAsRead={markAsRead}
        onClearNotifications={clearNotifications}
      />

      {/* Content Rendering: Home Page OR Dashboard Tools */}
      <main className="flex-1">
        {activeTab === 'home' ? (
          <Home
            lang={lang}
            user={user}
            onNavigate={(tab) => setActiveTab(tab)}
            showToast={handleShowToast}
            recentCount={logs.length}
            onOpenSubscription={() => setSubscriptionModalOpen(true)}
            onOpenUsageModal={() => setUsageModalOpen(true)}
          />
        ) : (
          <DashboardPage
            lang={lang}
            user={user}
            initialTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            onNavigateHome={() => setActiveTab('home')}
            logs={logs}
            logActivity={handleLogActivity}
            clearHistory={clearHistory}
            showToast={handleShowToast}
            tokens={tokens}
            plan={plan}
            account={account}
            onOpenSubscription={() => setSubscriptionModalOpen(true)}
            onOpenUsageModal={() => setUsageModalOpen(true)}
            deductTokens={deductTokens}
            hasEnoughTokens={hasEnoughTokens}
            onOpenTokenDepleted={handleOpenTokenDepleted}
          />
        )}
      </main>

      {/* Footer */}
      <Footer currentLang={lang} />

      {/* Subscription & Pricing Modal */}
      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        lang={lang}
        user={user}
        currentPlan={plan}
        currentTokens={tokens}
        onSubscribe={subscribeToPlan}
        onTopup={refillTokens}
        onOpenLogin={() => {
          setSubscriptionModalOpen(false);
          setAuthModalOpen(true);
        }}
        showToast={handleShowToast}
      />

      {/* Token & Usage Logs Modal */}
      <TokenUsageModal
        isOpen={usageModalOpen}
        onClose={() => setUsageModalOpen(false)}
        lang={lang}
        user={user}
        account={account}
        tokenLogs={tokenLogs}
        onOpenSubscription={() => {
          setUsageModalOpen(false);
          setSubscriptionModalOpen(true);
        }}
        onOpenLogin={() => {
          setUsageModalOpen(false);
          setAuthModalOpen(true);
        }}
      />

      {/* Insufficient Token Alert Modal */}
      <TokenDepletedModal
        isOpen={tokenDepletedModal.isOpen}
        onClose={() => setTokenDepletedModal((prev) => ({ ...prev, isOpen: false }))}
        lang={lang}
        requiredTokens={tokenDepletedModal.requiredTokens}
        currentTokens={tokens}
        toolName={tokenDepletedModal.toolName}
        onOpenSubscription={() => {
          setTokenDepletedModal((prev) => ({ ...prev, isOpen: false }));
          setSubscriptionModalOpen(true);
        }}
      />

      {/* Google Sign In Modal */}
      <GoogleAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          handleShowToast(lang === 'km' ? 'បានចូលគណនីជោគជ័យ!' : 'Signed in successfully!', 'success');
        }}
        lang={lang}
      />
    </div>
  );
}
