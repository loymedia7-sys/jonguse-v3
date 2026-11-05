import React, { useState } from 'react';
import {
  X,
  Coins,
  History,
  TrendingUp,
  Zap,
  Mail,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
  FileCode,
  Video,
  FileText,
  Volume2,
  QrCode,
  Image,
  Database,
  ExternalLink,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import { Language, UserAccountData, TokenTransaction } from '../../types';
import { TOOL_TOKEN_COSTS, SUBSCRIPTION_PLANS } from '../../data/plans';
import { User } from 'firebase/auth';

interface TokenUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  user: User | null;
  account: UserAccountData | null;
  tokenLogs: TokenTransaction[];
  onOpenSubscription: () => void;
  onOpenLogin: () => void;
}

export const TokenUsageModal: React.FC<TokenUsageModalProps> = ({
  isOpen,
  onClose,
  lang,
  user,
  account,
  tokenLogs,
  onOpenSubscription,
  onOpenLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'sql'>('logs');
  const [filterTool, setFilterTool] = useState<string>('all');
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === account?.plan) || SUBSCRIPTION_PLANS[0];
  const email = user?.email || account?.email || 'guest@jonguse.app';
  const tokens = account?.tokens ?? 0;
  const totalUsed = account?.totalTokensUsed ?? 0;
  const operationsCount = account?.operationsCount ?? 0;

  const filteredLogs = tokenLogs.filter((log) => {
    if (filterTool === 'all') return true;
    return log.tool === filterTool;
  });

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'srt':
        return <FileCode className="w-4 h-4 text-emerald-600" />;
      case 'videostyle':
        return <Video className="w-4 h-4 text-emerald-600" />;
      case 'ocr':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'tts':
        return <Volume2 className="w-4 h-4 text-emerald-600" />;
      case 'qr':
        return <QrCode className="w-4 h-4 text-emerald-600" />;
      case 'subscription':
      case 'topup':
        return <Zap className="w-4 h-4 text-amber-500" />;
      default:
        return <Coins className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getToolName = (tool: string) => {
    switch (tool) {
      case 'srt':
        return lang === 'km' ? 'បង្កើត Subtitle SRT' : 'Subtitle SRT';
      case 'videostyle':
        return lang === 'km' ? 'Style Subtitle វីដេអូ' : 'Video Styler';
      case 'ocr':
        return lang === 'km' ? 'OCR អានអក្សររូបភាព' : 'Doc/Image OCR';
      case 'tts':
        return lang === 'km' ? 'អានសំឡេង Khmer TTS' : 'Khmer TTS Voice';
      case 'qr':
        return lang === 'km' ? 'បង្កើត QR Code' : 'Custom QR';
      case 'subscription':
        return lang === 'km' ? 'ជាវគម្រោង (Subscription)' : 'Subscription Plan';
      case 'topup':
        return lang === 'km' ? 'បញ្ចូល Token (Top-up)' : 'Token Top-up';
      default:
        return tool;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-khmer text-white">
                  {lang === 'km' ? 'កំណត់ត្រា Token & ការប្រើប្រាស់' : 'Token Balance & Usage History'}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white font-khmer">
                  {currentPlan.name}
                </span>
              </div>
              <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                <span className="font-mono text-stone-300 font-medium">{email}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* User Account & Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Metric 1: Available Tokens */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 font-khmer">
                  {lang === 'km' ? 'Token ដែលនៅសល់' : 'Available Tokens'}
                </span>
                <Coins className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="my-2">
                <div className="text-3xl font-extrabold text-emerald-700">{tokens.toLocaleString()}</div>
                <div className="text-[11px] text-emerald-800 font-khmer mt-0.5">
                  {lang === 'km'
                    ? `គម្រោង ${currentPlan.nameKm}`
                    : `Active plan: ${currentPlan.name}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubscription();
                }}
                className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-khmer text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <span>{lang === 'km' ? '+ ជាវបន្ថែម (Get More)' : '+ Get More'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metric 2: Lifetime Tokens Used */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-600 font-khmer">
                  {lang === 'km' ? 'Token ប្រើប្រាស់សរុប' : 'Total Tokens Used'}
                </span>
                <TrendingUp className="w-4 h-4 text-stone-400" />
              </div>
              <div className="my-2">
                <div className="text-3xl font-extrabold text-stone-900">{totalUsed.toLocaleString()}</div>
                <div className="text-[11px] text-stone-500 font-khmer mt-0.5">
                  {lang === 'km' ? 'ការប្រើប្រាស់ទាំងអស់កន្លងមក' : 'Lifetime consumed tokens'}
                </div>
              </div>
              <div className="text-[11px] text-stone-400 font-khmer pt-2 border-t border-stone-200">
                {lang === 'km' ? 'គណនាដោយស្វ័យប្រវត្ត' : 'Tracked per account'}
              </div>
            </div>

            {/* Metric 3: Operations Run */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-600 font-khmer">
                  {lang === 'km' ? 'ប្រតិបត្តិការសរុប' : 'Total AI Operations'}
                </span>
                <Layers className="w-4 h-4 text-stone-400" />
              </div>
              <div className="my-2">
                <div className="text-3xl font-extrabold text-stone-900">{operationsCount.toLocaleString()}</div>
                <div className="text-[11px] text-stone-500 font-khmer mt-0.5">
                  {lang === 'km' ? 'បង្កើត SRT, Style, OCR, TTS' : 'SRT, Video, OCR, TTS runs'}
                </div>
              </div>
              <div className="text-[11px] text-stone-400 font-khmer pt-2 border-t border-stone-200">
                {lang === 'km' ? 'ដំណើរការយ៉ាងរលូន' : 'High reliability cloud'}
              </div>
            </div>
          </div>

          {/* Token Costs Reference Table */}
          <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider font-khmer mb-3 flex items-center justify-between">
              <span>{lang === 'km' ? 'អត្រា Token តាមឧបករណ៍នីមួយៗ (Token Pricing per Tool)' : 'Token Cost per Tool'}</span>
              <span className="text-[11px] font-normal text-stone-500 font-khmer">
                {lang === 'km' ? 'កាត់កងតាមការប្រើប្រាស់ពិត' : 'Per successful generation'}
              </span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-center">
                <FileCode className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                <div className="text-[11px] font-bold font-khmer text-stone-800">Subtitle SRT</div>
                <div className="text-xs font-extrabold text-emerald-700 mt-0.5">10+ Tokens</div>
                <div className="text-[9px] text-stone-400 font-khmer mt-0.5">≤200 chars (10+10/200)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-center">
                <Video className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                <div className="text-[11px] font-bold font-khmer text-stone-800">Video Styler</div>
                <div className="text-xs font-extrabold text-emerald-700 mt-0.5">{TOOL_TOKEN_COSTS.videostyle} Tokens</div>
                <div className="text-[9px] text-stone-400 font-khmer mt-0.5">per export</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-center">
                <FileText className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                <div className="text-[11px] font-bold font-khmer text-stone-800">OCR Text</div>
                <div className="text-xs font-extrabold text-emerald-700 mt-0.5">{TOOL_TOKEN_COSTS.ocr} Tokens</div>
                <div className="text-[9px] text-stone-400 font-khmer mt-0.5">per document</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-center">
                <Volume2 className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                <div className="text-[11px] font-bold font-khmer text-stone-800">Khmer TTS</div>
                <div className="text-xs font-extrabold text-emerald-700 mt-0.5">8+ Tokens</div>
                <div className="text-[9px] text-stone-400 font-khmer mt-0.5">≤200 chars (8+8/200)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-center">
                <QrCode className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                <div className="text-[11px] font-bold font-khmer text-stone-800">QR Code</div>
                <div className="text-xs font-extrabold text-emerald-700 mt-0.5">{TOOL_TOKEN_COSTS.qr} Token</div>
                <div className="text-[9px] text-stone-400 font-khmer mt-0.5">per code</div>
              </div>
            </div>
          </div>

          {/* Tab Switcher: Usage Logs vs SQL Database */}
          <div className="flex border-b border-stone-200">
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`flex-1 py-2.5 px-3 text-xs font-bold font-khmer flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'logs'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'ប្រវត្តិនៃការកាត់ Token' : 'Usage & Token Logs'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sql')}
              className={`flex-1 py-2.5 px-3 text-xs font-bold font-khmer flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'sql'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'តំណភ្ជាប់ SQL & Database' : 'SQL & Database Connect'}</span>
            </button>
          </div>

          {activeTab === 'logs' ? (
            /* Detailed Usage Logs Section */
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-stone-700" />
                  <h4 className="text-sm font-bold text-stone-900 font-khmer">
                    {lang === 'km' ? 'ប្រវត្តិនៃការកាត់ និងបញ្ចូល Token តាមគណនី' : 'Token Deduction & Credit Logs'}
                  </h4>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1 text-xs">
                  {['all', 'srt', 'videostyle', 'ocr', 'tts', 'subscription'].map((toolKey) => (
                    <button
                      key={toolKey}
                      type="button"
                      onClick={() => setFilterTool(toolKey)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-khmer transition-all cursor-pointer ${
                        filterTool === toolKey
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {toolKey === 'all' ? (lang === 'km' ? 'ទាំងអស់' : 'All') : toolKey.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log List */}
              {filteredLogs.length === 0 ? (
                <div className="py-8 text-center bg-stone-50 rounded-2xl border border-stone-200">
                  <Coins className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                  <p className="text-xs font-khmer text-stone-500">
                    {lang === 'km'
                      ? 'មិនទាន់មានកំណត់ត្រាប្រើប្រាស់ Token នៅឡើយទេ។ ចាប់ផ្ដើមដំណើរការឧបករណ៍ដើម្បីបង្កើតកំណត់ត្រា!'
                      : 'No token transactions recorded yet. Use any tool to view logs here.'}
                  </p>
                </div>
              ) : (
                <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100 bg-white shadow-xs">
                  {filteredLogs.map((log) => {
                    const isCredit = log.tokensDeducted < 0;
                    const dateStr = new Date(log.timestamp).toLocaleString(
                      lang === 'km' ? 'km-KH' : 'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    );

                    return (
                      <div
                        key={log.id}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-stone-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                            {getToolIcon(log.tool)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-stone-900 font-khmer truncate">
                              {log.title || getToolName(log.tool)}
                            </div>
                            <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                              <span>{dateStr}</span>
                              <span>•</span>
                              <span className="truncate max-w-[140px] font-mono">{log.userEmail || email}</span>
                              {log.summary && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[180px] text-stone-500">{log.summary}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs font-extrabold flex items-center justify-end gap-1 ${
                              isCredit ? 'text-emerald-600' : 'text-stone-900'
                            }`}
                          >
                            <span>{isCredit ? `+${Math.abs(log.tokensDeducted)}` : `-${log.tokensDeducted}`}</span>
                            <Coins className="w-3 h-3 text-stone-400" />
                          </div>
                          <div className="text-[10px] text-stone-400 font-khmer">
                            {lang === 'km' ? 'នៅសល់' : 'Bal'}: {log.tokensRemaining}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* SQL Database & Connection Section */
            <div className="space-y-4">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs font-khmer">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'km' ? 'តំណភ្ជាប់ទៅកាន់ Database' : 'Database Connection Links'}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-extrabold">
                    Online & Active
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 font-khmer leading-relaxed">
                  {lang === 'km'
                    ? 'ទិន្នន័យគណនី Token និងកំណត់ត្រាត្រូវបានរក្សាទុកក្នុង Cloud Database (Project: gen-lang-client-0586713722)។ លោកអ្នកអាចបើកមើលផ្ទាល់ក្នុង Web Console ឬទាញយក SQL Script យកទៅ Deploy ក្នុង PostgreSQL/Cloud SQL/SQLite បានគ្រប់ពេល។'
                    : 'Account records and tokens are actively persisted in Cloud Database (Project: gen-lang-client-0586713722). You can access the live Web Console or download the SQL export for PostgreSQL/Cloud SQL.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0586713722/firestore/databases/ai-studio-remixremixjongus-c0032be8-3573-4fc9-83a1-5042b9c03812/data"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100/60 transition-colors shadow-2xs"
                  >
                    <span className="truncate">Open Cloud Database Console</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1 text-emerald-600" />
                  </a>
                  <a
                    href="https://console.cloud.google.com/sql/instances?project=gen-lang-client-0586713722"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100/60 transition-colors shadow-2xs"
                  >
                    <span className="truncate">Google Cloud SQL Instances</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1 text-emerald-600" />
                  </a>
                </div>
              </div>

              {/* SQL Schema Preview & Actions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-stone-800 font-khmer flex items-center gap-1.5">
                    <span>{lang === 'km' ? 'គំរូ SQL Relational Tables (PostgreSQL / SQLite)' : 'SQL Relational Tables (PostgreSQL / SQLite)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="/api/sql/export"
                      download="jonguse_database.sql"
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-stone-500" />
                      <span>{lang === 'km' ? 'ទាញយក .sql' : 'Export SQL'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        fetch('/api/sql/schema')
                          .then((r) => r.text())
                          .then((txt) => {
                            navigator.clipboard.writeText(txt);
                            setCopiedSql(true);
                            setTimeout(() => setCopiedSql(false), 2000);
                          });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      {copiedSql ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-white" />}
                      <span>{copiedSql ? (lang === 'km' ? 'បានចម្លង!' : 'Copied!') : (lang === 'km' ? 'ចម្លង DDL' : 'Copy DDL')}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-stone-900 text-emerald-400 rounded-xl text-[11px] font-mono leading-relaxed overflow-x-auto max-h-40 border border-stone-800">
                  <pre>
{`CREATE TABLE users (
  uid VARCHAR(128) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  tokens INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE usage_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) REFERENCES users(uid),
  tool VARCHAR(50) NOT NULL,
  tokens_deducted INTEGER NOT NULL,
  tokens_remaining INTEGER NOT NULL,
  timestamp BIGINT NOT NULL
);`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-stone-500 font-khmer">
            {lang === 'km'
              ? 'Token ត្រូវបានរក្សាទុក និងការពារដោយស្វ័យប្រវត្តក្នុង Firestore Cloud'
              : 'Token balances & logs securely synced with Firestore'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold font-khmer text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              {lang === 'km' ? 'បិទ' : 'Close'}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSubscription();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold font-khmer bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'ជាវគម្រោង / ទិញបន្ថែម' : 'Subscribe / Refill'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
