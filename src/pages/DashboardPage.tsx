import React, { useState } from 'react';
import { SubtitleGeneratorPage } from './SubtitleGeneratorPage';
import { VideoSubtitleStylerPage } from './VideoSubtitleStylerPage';
import { OcrPage } from './OcrPage';
import { QrPage } from './QrPage';
import { TtsPage } from './TtsPage';
import { DownloaderPage } from './DownloaderPage';
import { HistoryPage } from './HistoryPage';
import { Language, SubtitleSegment, SubscriptionPlanId, UserAccountData } from '../types';
import { logoutUser } from '../firebase';
import { User } from 'firebase/auth';
import { translations } from '../lib/i18n';
import { TOOL_TOKEN_COSTS } from '../data/plans';
import {
  FileCode,
  Video,
  FileText,
  QrCode,
  Volume2,
  Download,
  Clock,
  LogOut,
  ChevronRight,
  Search,
  Settings,
  HelpCircle,
  Home,
  Menu,
  X,
  Coins,
  Zap,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

interface DashboardPageProps {
  lang: Language;
  user: User | null;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
  onNavigateHome: () => void;
  logs: any[];
  logActivity: (tool: any, title: string, summary: string, previewUrl?: string) => void;
  clearHistory: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  tokens: number;
  plan: SubscriptionPlanId;
  account: UserAccountData | null;
  onOpenSubscription: () => void;
  onOpenUsageModal: () => void;
  deductTokens: (cost: number, tool: string, title: string, summary?: string) => Promise<{ success: boolean; remaining: number }>;
  hasEnoughTokens: (cost: number) => boolean;
  onOpenTokenDepleted: (required: number, toolName: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  lang,
  user,
  initialTab = 'srt',
  onTabChange,
  onNavigateHome,
  logs,
  logActivity,
  clearHistory,
  showToast,
  tokens,
  plan,
  account,
  onOpenSubscription,
  onOpenUsageModal,
  deductTokens,
  hasEnoughTokens,
  onOpenTokenDepleted,
}) => {
  const [activeTab, setActiveTab] = useState<string>(
    initialTab === 'dashboard' || initialTab === 'overview' ? 'srt' : initialTab
  );
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sharedSrt, setSharedSrt] = useState<string>('');
  const [sharedSegments, setSharedSegments] = useState<SubtitleSegment[]>([]);

  React.useEffect(() => {
    if (initialTab && initialTab !== 'home') {
      const target = initialTab === 'dashboard' || initialTab === 'overview' ? 'srt' : initialTab;
      setActiveTab(target);
    }
  }, [initialTab]);

  const handleSelectToolTab = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const t = translations[lang];

  const handleNavigateToVideoStyler = (srtContent: string, segments: SubtitleSegment[]) => {
    setSharedSrt(srtContent);
    setSharedSegments(segments);
    setActiveTab('videostyle');
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      showToast(lang === 'km' ? 'បានចាកចេញដោយជោគជ័យ' : 'Signed out successfully', 'success');
      onNavigateHome();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleCheckAndDeduct = async (
    cost: number,
    tool: string,
    title: string,
    summary?: string
  ): Promise<boolean> => {
    if (!hasEnoughTokens(cost)) {
      const toolNames: Record<string, string> = {
        srt: lang === 'km' ? 'បង្កើត Subtitle SRT' : 'Subtitle SRT Generator',
        videostyle: lang === 'km' ? 'Video Subtitle Styler' : 'Video Subtitle Styler',
        ocr: lang === 'km' ? 'OCR អានអក្សរ' : 'Document OCR',
        tts: lang === 'km' ? 'សំឡេង Khmer TTS' : 'Khmer TTS Voice',
        qr: lang === 'km' ? 'បង្កើត QR Code' : 'Custom QR Code',
        download: lang === 'km' ? 'ទាញយកវីដេអូ (Downloader)' : 'Social Video Downloader',
      };
      onOpenTokenDepleted(cost, toolNames[tool] || tool);
      return false;
    }

    const res = await deductTokens(cost, tool, title, summary);
    return res.success;
  };

  const toolsList = [
    {
      id: 'srt',
      titleKm: 'បង្កើត Subtitle (.SRT)',
      titleEn: 'Subtitle SRT Generator',
      icon: FileCode,
    },
    {
      id: 'videostyle',
      titleKm: 'Style Subtitle លើវីដេអូ',
      titleEn: 'Video Subtitle Styler',
      icon: Video,
    },
    {
      id: 'download',
      titleKm: 'ទាញយកវីដេអូ (Downloader)',
      titleEn: 'Social Video Downloader',
      icon: Download,
    },
    {
      id: 'ocr',
      titleKm: 'OCR អានអក្សររូបភាព',
      titleEn: 'Document & Image OCR',
      icon: FileText,
    },
    {
      id: 'tts',
      titleKm: 'អានសំឡេង Khmer TTS',
      titleEn: 'Khmer TTS & Voice Cloning',
      icon: Volume2,
    },
    {
      id: 'qr',
      titleKm: 'បង្កើត QR Code ស្អាតៗ',
      titleEn: 'Custom Styled QR',
      icon: QrCode,
    },
    {
      id: 'history',
      titleKm: 'ប្រវត្តិនៃការប្រើប្រាស់',
      titleEn: 'Activity History',
      icon: Clock,
      badge: logs.length > 0 ? `${logs.length}` : undefined,
      badgeColor: 'bg-stone-200 text-stone-700',
    },
  ];

  const filteredTools = toolsList.filter((tool) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tool.titleKm.toLowerCase().includes(q) ||
      tool.titleEn.toLowerCase().includes(q) ||
      tool.id.toLowerCase().includes(q)
    );
  });

  const getPlanName = () => {
    switch (plan) {
      case 'studio_ultra':
        return 'Ultra';
      case 'creator_pro':
        return 'Pro';
      default:
        return 'Free';
    }
  };

  const userEmail = user?.email || account?.email || 'guest@jonguse.app';

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-[#f8fafc]">
      {/* Mobile Top Controls Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 sticky top-16 z-30 shadow-xs">
        <button
          type="button"
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className="p-2 -ml-2 rounded-xl text-stone-700 hover:bg-stone-100 flex items-center gap-2 cursor-pointer font-khmer text-xs font-bold"
        >
          {leftSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span>{lang === 'km' ? 'ម៉ឺនុយឧបករណ៍' : 'Menu'}</span>
        </button>

        {/* Mobile Token Counter */}
        <button
          type="button"
          onClick={onOpenUsageModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono font-bold"
        >
          <Coins className="w-3.5 h-3.5 text-emerald-600" />
          <span>{tokens.toLocaleString()}</span>
        </button>
      </div>

      {/* Left Navigation Sidebar */}
      <aside
        className={`
          fixed md:sticky top-16 z-30
          w-72 bg-white md:bg-stone-50/90
          border-r border-stone-200
          p-4 sm:p-5 flex flex-col justify-between
          h-[calc(100vh-4rem)] overflow-y-auto
          transition-transform duration-200 ease-in-out
          ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="space-y-4">
          {/* Quick Search inside Sidebar */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'km' ? 'ស្វែងរកឧបករណ៍...' : 'Search tools...'}
              className="w-full pl-9 pr-3 py-2 bg-stone-100 md:bg-white rounded-xl border border-stone-200 text-xs font-khmer focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Account Token & Subscription Widget */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 font-khmer">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'km' ? 'សមតុល្យ Token' : 'Token Balance'}</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                {getPlanName()}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black font-mono text-emerald-700">
                  {tokens.toLocaleString()}
                </span>
                <span className="text-[11px] font-khmer text-stone-500 ml-1">Tokens</span>
              </div>
              <button
                type="button"
                onClick={onOpenUsageModal}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline font-khmer cursor-pointer"
              >
                {lang === 'km' ? 'ប្រវត្តិប្រើ' : 'History'}
              </button>
            </div>

            {/* Email Label */}
            <div className="text-[11px] text-stone-500 truncate font-mono bg-white/70 px-2 py-1 rounded-lg border border-emerald-100">
              {userEmail}
            </div>

            {/* Upgrade / Top up button */}
            <button
              type="button"
              onClick={onOpenSubscription}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs font-khmer flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>{lang === 'km' ? 'ជាវគម្រោង / ទិញ Token' : 'Get More Tokens'}</span>
            </button>
          </div>

          {/* Primary Tools Navigation List */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400 font-khmer">
              {lang === 'km' ? 'ឧបករណ៍ទាំងអស់ (Tools)' : 'AI Utilities'}
            </div>

            {filteredTools.map((tool) => {
              const isActive = activeTab === tool.id;
              const Icon = tool.icon;
              const title = lang === 'km' ? tool.titleKm : tool.titleEn;

              return (
                <button
                  key={tool.id}
                  type="button"
                  id={`sidebar-tab-${tool.id}`}
                  onClick={() => {
                    handleSelectToolTab(tool.id);
                    setLeftSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left text-xs font-khmer transition-all cursor-pointer group
                    ${
                      isActive
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'text-stone-700 hover:bg-stone-100 md:hover:bg-stone-200/70'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-emerald-600 group-hover:text-emerald-700'
                      }`}
                    />
                    <span className="truncate">{title}</span>
                  </div>

                  {tool.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 font-mono ${
                        isActive
                          ? 'bg-emerald-700/80 text-white'
                          : tool.badgeColor
                      }`}
                    >
                      {tool.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary Navigation */}
          <div className="pt-2 border-t border-stone-200 space-y-1">
            <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400 font-khmer">
              {lang === 'km' ? 'ការកំណត់ & ជំនួយ' : 'Settings & Help'}
            </div>

            <button
              type="button"
              onClick={onOpenSubscription}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors font-khmer cursor-pointer"
            >
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{lang === 'km' ? 'គម្រោង Subscription' : 'Subscription Plans'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenUsageModal}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors font-khmer cursor-pointer"
            >
              <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{lang === 'km' ? 'កំណត់ត្រាការប្រើប្រាស់' : 'Token Usage Logs'}</span>
            </button>
          </div>
        </div>

        {/* User Status / Info Card */}
        <div className="pt-4 mt-6 border-t border-stone-200 space-y-2.5">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 md:bg-white border border-stone-200 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User"
                    className="w-8 h-8 rounded-full object-cover border border-emerald-500"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'J'}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-900 truncate font-khmer">
                  {user?.displayName || (lang === 'km' ? 'អ្នកបង្កើតមាតិកា' : 'Creator')}
                </div>
                <div className="text-[10px] text-stone-400 font-mono truncate">
                  {userEmail}
                </div>
              </div>
            </div>

            {user && !user.isAnonymous && (
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold font-khmer text-stone-600 hover:text-stone-950 hover:bg-stone-100 md:hover:bg-stone-200/70 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-stone-500" />
            <span>{lang === 'km' ? 'ត្រឡប់ទៅទំព័រដើម (Home)' : 'Back to Home'}</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Stage */}
      <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 bg-[#f8fafc] overflow-y-auto">
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-3.5 sm:p-6 min-h-[600px]">
          {activeTab === 'srt' && (
            <SubtitleGeneratorPage
              lang={lang}
              onLogActivity={(tool, title, sum) => logActivity(tool, title, sum)}
              showToast={showToast}
              onNavigateToVideoStyler={handleNavigateToVideoStyler}
              tokens={tokens}
              onCheckAndDeductTokens={handleCheckAndDeduct}
            />
          )}

          {activeTab === 'videostyle' && (
            <VideoSubtitleStylerPage
              lang={lang}
              onLogActivity={(tool, title, sum, preview) => logActivity(tool, title, sum, preview)}
              showToast={showToast}
              initialSrt={sharedSrt}
              initialSegments={sharedSegments}
              tokens={tokens}
              onCheckAndDeductTokens={handleCheckAndDeduct}
            />
          )}

          {activeTab === 'ocr' && (
            <OcrPage
              lang={lang}
              onLogActivity={(tool, title, sum, preview) => logActivity(tool, title, sum, preview)}
              showToast={showToast}
              tokens={tokens}
              onCheckAndDeductTokens={handleCheckAndDeduct}
            />
          )}

          {activeTab === 'qr' && (
            <QrPage
              lang={lang}
              onLogActivity={(tool, title, sum) => logActivity(tool, title, sum)}
              showToast={showToast}
              tokens={tokens}
              onCheckAndDeductTokens={handleCheckAndDeduct}
            />
          )}

          {activeTab === 'tts' && (
            <TtsPage
              lang={lang}
              onLogActivity={(tool, title, sum) => logActivity(tool, title, sum)}
              showToast={showToast}
              tokens={tokens}
              onCheckAndDeductTokens={handleCheckAndDeduct}
            />
          )}

          {activeTab === 'download' && (
            <DownloaderPage
              lang={lang}
              onLogActivity={(tool, title, sum, preview) => logActivity(tool, title, sum, preview)}
              showToast={showToast}
              tokens={tokens}
              onCheckAndDeductTokens={handleCheckAndDeduct}
            />
          )}

          {activeTab === 'history' && (
            <HistoryPage
              lang={lang}
              logs={logs}
              onClearHistory={clearHistory}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
        </div>
      </main>
    </div>
  );
};
