import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Language } from '../types';
import { translations } from '../lib/i18n';
import { Card } from '../components/ui/Card';
import { SUBSCRIPTION_PLANS } from '../data/plans';
import {
  FileText,
  QrCode,
  Volume2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
  FileCode,
  Video,
  Download,
  Loader2,
  Coins,
  Check,
  Sparkles,
} from 'lucide-react';

interface HomeProps {
  lang: Language;
  user: User | null;
  onNavigate: (tool: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  recentCount?: number;
  onOpenSubscription?: () => void;
  onOpenUsageModal?: () => void;
}

export const Home: React.FC<HomeProps> = ({
  lang,
  user,
  onNavigate,
  showToast,
  onOpenSubscription,
  onOpenUsageModal,
}) => {
  const t = translations[lang];
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const isLoggedIn = !!user && !user.isAnonymous;

  const handleStartTools = (toolId: string = 'srt') => {
    onNavigate(toolId);
  };

  const tools = [
    {
      id: 'srt',
      titleKm: 'បង្កើត Subtitle (.SRT) ស្វ័យប្រវត្ត',
      titleEn: 'Generate Subtitle (.SRT)',
      descKm: 'សរសេរ ឬបិទភ្ជាប់ Script ដើម្បីបង្កើតឯកសារ .SRT ដែលមាន Timing និង Timecode ច្បាស់លាស់ ងាយស្រួលទាញយក',
      descEn: 'Generate perfectly-timed .SRT subtitle files from text/dialogue scripts with automatic speech pacing',
      icon: <FileCode className="w-6 h-6 text-emerald-600" />,
    },
    {
      id: 'videostyle',
      titleKm: 'កែសម្រួល Style Subtitle លើវីដេអូ',
      titleEn: 'Auto Edit Subtitle Style on Video',
      descKm: 'Upload វីដេអូ & .SRT ដើម្បីតុបតែង Font ខ្មែរស្អាតៗ (បាត់ដំបង គូលែន បាយ័ន) និង Export វីដេអូបានភ្លាមៗ',
      descEn: 'Drop video & SRT to style subtitles with Khmer fonts (Battambang, Koulen, Bayon) & export burned-in video',
      icon: <Video className="w-6 h-6 text-emerald-600" />,
    },
    {
      id: 'download',
      titleKm: 'ទាញយកវីដេអូ (Downloader)',
      titleEn: 'Social Video Downloader',
      descKm: 'ទាញយកវីដេអូពី TikTok, Douyin, Facebook, Pinterest & YouTube កម្រិតច្បាស់ Full HD & 4K',
      descEn: 'Download high-quality videos from TikTok, Douyin, Facebook, Pinterest & YouTube with real resolutions',
      icon: <Download className="w-6 h-6 text-emerald-600" />,
    },
    {
      id: 'ocr',
      titleKm: 'OCR អានអត្ថបទពីរូបភាព',
      titleEn: 'Document & Photo OCR',
      descKm: 'ស្រង់អក្សរខ្មែរ និងអង់គ្លេសពីរូបថត ឯកសារ វិក្កយបត្រ ព្រមទាំងបកប្រែស្វ័យប្រវត្ត',
      descEn: 'High-accuracy OCR for Khmer script and English texts with instant translation',
      icon: <FileText className="w-6 h-6 text-emerald-600" />,
    },
    {
      id: 'qr',
      titleKm: 'បង្កើត QR Code ស្អាតៗ',
      titleEn: 'Custom Styled QR Generator',
      descKm: 'បង្កើត QR Code សម្រាប់ Link, Wi-Fi, អក្សរ ជាមួយពណ៌ និង Logo កណ្តាល',
      descEn: 'Create vector-sharp QR codes with custom styles, dots, and center branding',
      icon: <QrCode className="w-6 h-6 text-emerald-600" />,
    },
    {
      id: 'tts',
      titleKm: 'អានអត្ថបទជាសំឡេង (TTS)',
      titleEn: 'Text-to-Speech Voice',
      descKm: 'បង្កើតសំឡេងអានភាសាខ្មែរ និងអង់គ្លេសយ៉ាងពីរោះរណ្តំ និងច្បាស់ល្អ',
      descEn: 'Natural sounding Khmer and English speech voice synthesis',
      icon: <Volume2 className="w-6 h-6 text-emerald-600" />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Hero Presentation */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <h1 className="text-4xl sm:text-5xl font-bayon text-stone-900 tracking-tight leading-tight">
          {t.appName} — {t.tagline}
        </h1>

        <p className="text-base sm:text-lg text-stone-600 font-khmer max-w-2xl mx-auto leading-relaxed">
          {t.subTagline}
        </p>

        {/* Hero CTA Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleStartTools('srt')}
            disabled={isLoggingIn}
            className="py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-khmer text-sm shadow-md hover:shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>
              {isLoggedIn
                ? (lang === 'km' ? 'ចូលទៅកាន់ Dashboard' : 'Open Creator Dashboard')
                : (lang === 'km' ? 'ចាប់ផ្តើមប្រើប្រាស់ (100 Free Tokens)' : 'Start Free (100 Starter Tokens)')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSubscription}
            className="py-3.5 px-5 rounded-2xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-bold font-khmer text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'km' ? 'មើលគម្រោងជាវ (Pricing)' : 'Subscription Plans'}</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs text-stone-500 font-khmer">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'km' ? 'ផ្ដល់ជូន 100 Token ឥតគិតថ្លៃពេលចុះឈ្មោះ' : '100 Free Tokens on Sign up'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe2 className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'km' ? 'គាំទ្រភាសាខ្មែរ និងអន្តរជាតិ' : 'Khmer & Multilingual'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'km' ? 'តាមដានការប្រើប្រាស់តាម Email នីមួយៗ' : 'Usage Tracked Per Account Email'}</span>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div id="features-section" className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bayon tracking-wide text-stone-900">
            {t.allTools}
          </h2>
          <span className="text-xs text-stone-500 font-mono font-medium">
            5 Essential Utilities
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const title = lang === 'km' ? tool.titleKm : tool.titleEn;
            return (
              <Card
                key={tool.id}
                id={`tool-card-${tool.id}`}
                hoverable
                onClick={() => handleStartTools(tool.id)}
                className="flex flex-col justify-between h-full group border-stone-200 hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer bg-white"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 group-hover:bg-emerald-50 text-stone-700 group-hover:text-emerald-600 flex items-center justify-center transition-colors">
                      {tool.icon}
                    </div>
                    <span className="w-8 h-8 rounded-full bg-stone-100 group-hover:bg-emerald-100 text-stone-400 group-hover:text-emerald-600 flex items-center justify-center transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>

                  <h3 className="font-bayon text-lg text-stone-900 group-hover:text-emerald-700 transition-colors mb-1">
                    {title}
                  </h3>
                  <p className="text-xs text-stone-600 font-khmer leading-relaxed mb-4">
                    {lang === 'km' ? tool.descKm : tool.descEn}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform font-khmer">
                  <span>
                    {lang === 'km' ? 'បើកប្រើប្រាស់ឧបករណ៍' : 'Open Tool'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Subscription Plans & Token Packs Showcase */}
      <div className="space-y-6 pt-6 border-t border-stone-200">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold font-khmer">
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'km' ? 'គម្រោងជាវ & Token បន្ថែម' : 'Subscription Plans & Token Refills'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bayon text-stone-900 tracking-tight">
            {lang === 'km' ? 'ជ្រើសរើសគម្រោងដើម្បីទទួលបាន Token កាន់តែច្រើន' : 'Choose a Plan to Get More Tokens'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 font-khmer">
            {lang === 'km'
              ? 'គាំទ្រការទូទាត់រហ័សតាម KHQR, Bakong, Wing, ABA ឬកាតធនាគារ ងាយស្រួល និងសុវត្ថិភាព'
              : 'Seamless billing via Bakong KHQR, Wing, ABA, and international cards.'}
          </p>
        </div>

        {/* 3 Tier Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {SUBSCRIPTION_PLANS.map((p) => {
            const isPro = p.id === 'creator_pro';
            return (
              <div
                key={p.id}
                className={`p-6 rounded-3xl border flex flex-col justify-between transition-all bg-white shadow-xs ${
                  isPro
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md relative'
                    : 'border-stone-200'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider font-khmer shadow-xs">
                    {lang === 'km' ? 'ពេញនិយមបំផុត (Popular)' : 'Most Popular'}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bayon text-lg text-stone-900">
                      {lang === 'km' ? p.nameKm : p.name}
                    </h3>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Coins className="w-4 h-4" />
                    </div>
                  </div>

                  <p className="text-xs text-stone-500 font-khmer mb-4 min-h-[36px]">
                    {lang === 'km' ? p.descriptionKm : p.descriptionEn}
                  </p>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black font-sans text-stone-900">
                        ${p.priceMonthlyUSD}
                      </span>
                      <span className="text-xs text-stone-500 font-khmer">
                        {lang === 'km' ? '/ខែ' : '/month'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-bold text-emerald-700 font-khmer flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {p.tokensPerMonth.toLocaleString()} {lang === 'km' ? 'Tokens ក្នុងមួយខែ' : 'Tokens / mo'}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-stone-700 font-khmer border-t border-stone-100 pt-4 mb-6">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{lang === 'km' ? feat.textKm : feat.textEn}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={onOpenSubscription}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold font-khmer transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                    isPro
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-900'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    {p.id === 'free'
                      ? (lang === 'km' ? 'ប្រើឥតគិតថ្លៃ' : 'Current Tier')
                      : (lang === 'km' ? 'ជាវគម្រោងឥឡូវនេះ' : 'Subscribe Now')}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
