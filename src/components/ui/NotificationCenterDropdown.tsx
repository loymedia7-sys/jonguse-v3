import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  FileCode,
  Video,
  FileText,
  QrCode,
  Sparkles,
  Smartphone,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { AppNotification } from '../../hooks/useNotifications';
import { Language } from '../../types';

interface NotificationCenterDropdownProps {
  lang: Language;
  notifications: AppNotification[];
  unreadCount: number;
  soundEnabled: boolean;
  awayAlertEnabled: boolean;
  browserPermission: NotificationPermission;
  onToggleSound: () => void;
  onToggleAwayAlert: () => void;
  onRequestPushPermission: () => Promise<boolean>;
  onSendTestNotification: () => void;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onSelectTool?: (tool: string) => void;
}

export const NotificationCenterDropdown: React.FC<NotificationCenterDropdownProps> = ({
  lang,
  notifications,
  unreadCount,
  soundEnabled,
  awayAlertEnabled,
  browserPermission,
  onToggleSound,
  onToggleAwayAlert,
  onRequestPushPermission,
  onSendTestNotification,
  onMarkAllAsRead,
  onMarkAsRead,
  onClearAll,
  onSelectTool,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && unreadCount > 0) {
      onMarkAllAsRead();
    }
  };

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'srt':
        return { icon: FileCode, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'videostyle':
        return { icon: Video, color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'ocr':
        return { icon: FileText, color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'tts':
        return { icon: Volume2, color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'qr':
        return { icon: QrCode, color: 'bg-teal-100 text-teal-700 border-teal-200' };
      default:
        return { icon: Sparkles, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
  };

  const formatTimeAgo = (ts: number) => {
    const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) {
      return lang === 'km' ? 'ទើបតែរួចរាល់' : 'Just now';
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return lang === 'km' ? `${diffMin} នាទីមុន` : `${diffMin}m ago`;
    }
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) {
      return lang === 'km' ? `${diffHr} ម៉ោងមុន` : `${diffHr}h ago`;
    }
    const diffDay = Math.floor(diffHr / 24);
    return lang === 'km' ? `${diffDay} ថ្ងៃមុន` : `${diffDay}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-label="Notifications"
        className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
        }`}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600 animate-pulse" />
        ) : (
          <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-stone-600" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black font-mono flex items-center justify-center border-2 border-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Drop-Down Panel (Responsive Mobile Sheet + Desktop Popover) */}
      {isOpen && (
        <div className="fixed sm:absolute left-2.5 right-2.5 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-3xl shadow-2xl border border-stone-200 z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-khmer">
                  {lang === 'km' ? 'ការជូនដំណឹងលើទូរស័ព្ទ & ឧបករណ៍' : 'Mobile & Tool Alerts'}
                </h3>
                <p className="text-[10px] text-stone-400 font-khmer">
                  {lang === 'km'
                    ? 'លោតប្រាប់ពេលឧបករណ៍រួចរាល់ ឬពេលចាកចេញពីទំព័រ'
                    : 'Alerts when tools finish or when away from page'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  title={lang === 'km' ? 'លុបទាំងអស់' : 'Clear all'}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Alert Controls Bar */}
          <div className="p-3 bg-stone-50 border-b border-stone-200 space-y-2.5">
            {/* Browser/Mobile System Push Permission Banner */}
            {browserPermission !== 'granted' && (
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-bold text-emerald-950 font-khmer leading-tight">
                    {lang === 'km'
                      ? 'បើកសារជូនដំណឹងលើទូរស័ព្ទ (ទោះបិទអេក្រង់ ឬចេញក្រៅទំព័រ)'
                      : 'Enable Mobile Push Alerts when outside page'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onRequestPushPermission}
                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold font-khmer shrink-0 cursor-pointer shadow-xs"
                >
                  {lang === 'km' ? 'អនុញ្ញាត' : 'Enable'}
                </button>
              </div>
            )}

            {/* Quick Toggles Row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={onToggleSound}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-khmer border transition-colors cursor-pointer ${
                    soundEnabled
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-stone-600 border-stone-200'
                  }`}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                  <span>{lang === 'km' ? 'សំឡេងរោទ៍' : 'Sound'}</span>
                </button>

                {/* Away Page Alert Toggle */}
                <button
                  type="button"
                  onClick={onToggleAwayAlert}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-khmer border transition-colors cursor-pointer ${
                    awayAlertEnabled
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-stone-600 border-stone-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'រំលឹកពេលចេញពីទំព័រ' : 'Away Alert'}</span>
                </button>
              </div>

              {/* Test Drop-Down Alert Button */}
              <button
                type="button"
                onClick={() => {
                  onSendTestNotification();
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold font-khmer shadow-xs transition-colors cursor-pointer"
              >
                <BellRing className="w-3 h-3" />
                <span>{lang === 'km' ? 'សាកល្បង Drop-Down' : 'Test Drop-Down'}</span>
              </button>
            </div>
          </div>

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
            {notifications.length === 0 ? (
              <div className="py-10 px-6 text-center space-y-2">
                <div className="w-11 h-11 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-stone-700 font-khmer">
                  {lang === 'km' ? 'មិនទាន់មានការជូនដំណឹងនៅឡើយទេ' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-stone-500 font-khmer max-w-xs mx-auto leading-relaxed">
                  {lang === 'km'
                    ? 'រាល់ពេលអ្នកប្រើឧបករណ៍រួចរាល់ ឬពេលអ្នកចាកចេញពីទំព័រ សារជូនដំណឹងនឹងធ្លាក់ចុះមកលើទូរស័ព្ទរបស់អ្នកដោយស្វ័យប្រវត្ត។'
                    : 'Whenever a tool completes or when you leave the page, mobile drop-down alerts will appear here.'}
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const meta = getToolIcon(item.tool);
                const ToolIcon = meta.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onMarkAsRead(item.id);
                      if (item.tool && item.tool !== 'system') {
                        onSelectTool?.(item.tool);
                      }
                      setIsOpen(false);
                    }}
                    className={`p-3.5 hover:bg-emerald-50/50 transition-colors cursor-pointer flex items-start gap-3 ${
                      !item.read ? 'bg-emerald-50/30' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${meta.color}`}
                    >
                      <ToolIcon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-stone-900 font-khmer truncate">
                          {lang === 'km' ? item.titleKm : item.title}
                        </span>
                        <span className="text-[10px] text-stone-400 font-khmer shrink-0">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-600 font-khmer line-clamp-2 mt-0.5 leading-relaxed">
                        {lang === 'km' ? item.messageKm : item.message}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {item.wasAway && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-bold font-khmer">
                              {lang === 'km' ? 'ពេលមិននៅលើទំព័រ' : 'While away'}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 font-khmer">
                            <CheckCheck className="w-3 h-3" />
                            {lang === 'km' ? 'រួចរាល់' : 'Completed'}
                          </span>
                        </div>

                        {item.tool && item.tool !== 'system' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 hover:underline font-khmer">
                            <span>{lang === 'km' ? 'បើកឧបករណ៍' : 'Open tool'}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
