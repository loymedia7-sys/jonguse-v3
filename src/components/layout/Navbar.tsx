import React, { useState } from 'react';
import { LangToggle } from '../ui/LangToggle';
import { NotificationCenterDropdown } from '../ui/NotificationCenterDropdown';
import { AppNotification } from '../../hooks/useNotifications';
import { Language, SubscriptionPlanId } from '../../types';
import { User } from 'firebase/auth';
import {
  Coins,
  Zap,
  User as UserIcon,
  LogOut,
  History,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  tokens: number;
  plan: SubscriptionPlanId;
  user: User | null;
  onOpenSubscription: () => void;
  onOpenUsageModal: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  notifications?: AppNotification[];
  unreadCount?: number;
  soundEnabled?: boolean;
  awayAlertEnabled?: boolean;
  browserPermission?: NotificationPermission;
  onToggleSound?: () => void;
  onToggleAwayAlert?: () => void;
  onRequestPushPermission?: () => Promise<boolean>;
  onSendTestNotification?: () => void;
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (id: string) => void;
  onClearNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  onSelectTab,
  tokens,
  plan,
  user,
  onOpenSubscription,
  onOpenUsageModal,
  onOpenLogin,
  onLogout,
  notifications = [],
  unreadCount = 0,
  soundEnabled = true,
  awayAlertEnabled = true,
  browserPermission = 'default',
  onToggleSound = () => {},
  onToggleAwayAlert = () => {},
  onRequestPushPermission = async () => false,
  onSendTestNotification = () => {},
  onMarkAllAsRead = () => {},
  onMarkAsRead = () => {},
  onClearNotifications = () => {},
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const getPlanBadge = (p: SubscriptionPlanId) => {
    switch (p) {
      case 'studio_ultra':
        return { label: 'Ultra', bg: 'bg-purple-600 text-white' };
      case 'creator_pro':
        return { label: 'Pro', bg: 'bg-emerald-600 text-white' };
      default:
        return { label: 'Free', bg: 'bg-stone-200 text-stone-700' };
    }
  };

  const planBadge = getPlanBadge(plan);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Title */}
          <div
            id="brand-logo"
            onClick={() => onSelectTab?.('home')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group shrink-0"
          >
            <img
              src="/logo.png"
              alt="JongUse Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl object-cover border border-stone-200/80 shadow-xs group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bayon text-lg sm:text-xl tracking-wide text-stone-900 group-hover:text-emerald-600 transition-colors">
                ចង់ប្រើ
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans">
                JONGUSE
              </span>
            </div>
          </div>

          {/* Right Controls: Notification Bell, Account Avatar & Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile & Tool Notification Center Bell + Drop-Down */}
            <NotificationCenterDropdown
              lang={currentLang}
              notifications={notifications}
              unreadCount={unreadCount}
              soundEnabled={soundEnabled}
              awayAlertEnabled={awayAlertEnabled}
              browserPermission={browserPermission}
              onToggleSound={onToggleSound}
              onToggleAwayAlert={onToggleAwayAlert}
              onRequestPushPermission={onRequestPushPermission}
              onSendTestNotification={onSendTestNotification}
              onMarkAllAsRead={onMarkAllAsRead}
              onMarkAsRead={onMarkAsRead}
              onClearAll={onClearNotifications}
              onSelectTool={(tool) => onSelectTab?.(tool)}
            />

            {/* User Account / Profile Menu */}
            <div className="relative">
              {user && !user.isAnonymous ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-stone-100 border border-transparent hover:border-stone-200 transition-all cursor-pointer"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="User"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-emerald-500"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-stone-500 hidden sm:block" />
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div
                      onMouseLeave={() => setUserMenuOpen(false)}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 text-stone-800 animate-fade-in"
                    >
                      <div className="px-4 py-2.5 border-b border-stone-100">
                        <div className="text-xs font-bold text-stone-900 truncate">
                          {user.displayName || 'Creator'}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono truncate mt-0.5">
                          {user.email}
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">
                          <span className="text-[11px] font-khmer text-stone-500">
                            {currentLang === 'km' ? 'សមតុល្យ Token:' : 'Token Balance:'}
                          </span>
                          <span className="text-xs font-bold text-emerald-700">
                            {tokens.toLocaleString()} Tokens
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            onOpenUsageModal();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-stone-100 font-khmer text-left transition-colors cursor-pointer"
                        >
                          <History className="w-4 h-4 text-emerald-600" />
                          <span>{currentLang === 'km' ? 'កំណត់ត្រា Token & ការប្រើប្រាស់' : 'Token & Usage Logs'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            onOpenSubscription();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-stone-100 font-khmer text-left transition-colors cursor-pointer"
                        >
                          <Zap className="w-4 h-4 text-emerald-600" />
                          <span>{currentLang === 'km' ? 'ជាវគម្រោង ឬទិញ Token បន្ថែម' : 'Subscription & Refills'}</span>
                        </button>

                        <div className="my-1 border-t border-stone-100" />

                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-khmer text-left transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>{currentLang === 'km' ? 'ចាកចេញពីគណនី' : 'Sign Out'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-stone-300 hover:border-emerald-500 hover:bg-stone-50 text-stone-800 text-xs font-bold font-khmer transition-all cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-stone-500" />
                  <span className="hidden sm:inline">
                    {currentLang === 'km' ? 'ចូលគណនី' : 'Sign In'}
                  </span>
                </button>
              )}
            </div>

            {/* Language Switcher */}
            <LangToggle currentLang={currentLang} onToggle={onLanguageChange} />
          </div>
        </div>
      </div>
    </header>
  );
};
