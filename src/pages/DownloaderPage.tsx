import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import {
  fetchVideoInfo,
  startDownload,
  pollJobStatus,
  VideoInfo,
  QualityOption,
  DownloadJob,
  SupportedPlatform,
} from '../lib/downloaderApi';
import {
  Download,
  Link as LinkIcon,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Music,
  Video,
  ExternalLink,
  ShieldAlert,
  Coins,
  RefreshCw,
  Copy,
  Check,
  Film,
  Zap,
} from 'lucide-react';

interface DownloaderPageProps {
  lang: Language;
  onLogActivity?: (tool: any, title: string, summary: string, previewUrl?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  tokens: number;
  onCheckAndDeductTokens: (
    cost: number,
    tool: string,
    title: string,
    summary?: string
  ) => Promise<boolean>;
}

const PLATFORMS: Array<{
  id: SupportedPlatform;
  name: string;
  color: string;
  domains: string[];
}> = [
  { id: 'tiktok', name: 'TikTok', color: 'bg-black text-white', domains: ['tiktok.com', 'vm.tiktok.com'] },
  { id: 'douyin', name: 'Douyin (抖音)', color: 'bg-red-600 text-white', domains: ['douyin.com', 'v.douyin.com'] },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-600 text-white', domains: ['facebook.com', 'fb.watch'] },
  { id: 'pinterest', name: 'Pinterest', color: 'bg-rose-600 text-white', domains: ['pinterest.com', 'pin.it'] },
  { id: 'youtube', name: 'YouTube', color: 'bg-red-700 text-white', domains: ['youtube.com', 'youtu.be'] },
];

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const DownloaderPage: React.FC<DownloaderPageProps> = ({
  lang,
  onLogActivity,
  showToast,
  tokens,
  onCheckAndDeductTokens,
}) => {
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<SupportedPlatform | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  
  // Job state
  const [activeJob, setActiveJob] = useState<DownloadJob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isStartingDownload, setIsStartingDownload] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hasChargedToken, setHasChargedToken] = useState(false);

  const pollCleanupRef = useRef<(() => void) | null>(null);

  // Auto-detect platform from pasted link
  useEffect(() => {
    const raw = url.toLowerCase().trim();
    if (!raw) {
      setDetectedPlatform(null);
      return;
    }

    if (raw.includes('tiktok.com')) setDetectedPlatform('tiktok');
    else if (raw.includes('douyin.com')) setDetectedPlatform('douyin');
    else if (raw.includes('facebook.com') || raw.includes('fb.watch') || raw.includes('fb.com')) setDetectedPlatform('facebook');
    else if (raw.includes('pinterest.com') || raw.includes('pin.it')) setDetectedPlatform('pinterest');
    else if (raw.includes('youtube.com') || raw.includes('youtu.be')) setDetectedPlatform('youtube');
    else setDetectedPlatform(null);
  }, [url]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollCleanupRef.current) {
        pollCleanupRef.current();
      }
    };
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      showToast(
        lang === 'km' ? 'សូមចុច Paste ដោយដៃ' : 'Please paste the link manually',
        'error'
      );
    }
  };

  const handleFetchInfo = async () => {
    if (!url.trim()) {
      showToast(
        lang === 'km' ? 'សូមបញ្ចូលតំណភ្ជាប់វីដេអូ' : 'Please enter a video URL',
        'error'
      );
      return;
    }

    setIsLoadingInfo(true);
    setVideoInfo(null);
    setActiveJob(null);
    setDownloadUrl(null);
    setHasChargedToken(false);

    try {
      const info = await fetchVideoInfo(url.trim());
      setVideoInfo(info);
      setDetectedPlatform(info.platform);

      // Default select the best video quality or first option
      if (info.qualities.length > 0) {
        setSelectedQuality(info.qualities[0].id);
      }
      showToast(
        lang === 'km' ? 'ទទួលបានព័ត៌មានវីដេអូជោគជ័យ' : 'Video details retrieved',
        'success'
      );
    } catch (err: any) {
      console.error('Fetch info error:', err);
      const msg = lang === 'km' && err.errorKm ? err.errorKm : err.message || 'Could not fetch video info';
      showToast(msg, 'error');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleStartDownload = async () => {
    if (!videoInfo || !selectedQuality) return;

    // Check token balance beforehand (5 tokens cost)
    if (tokens < 5) {
      showToast(
        lang === 'km' ? 'អ្នកត្រូវការយ៉ាងតិច 5 Tokens ដើម្បីទាញយក' : 'You need at least 5 tokens to download',
        'error'
      );
      return;
    }

    setIsStartingDownload(true);
    setDownloadUrl(null);
    setHasChargedToken(false);

    try {
      const job = await startDownload(videoInfo.url, selectedQuality);
      setActiveJob(job);

      // Start polling
      if (pollCleanupRef.current) {
        pollCleanupRef.current();
      }

      pollCleanupRef.current = pollJobStatus(job.id, async (updatedJob, readyDownloadUrl) => {
        setActiveJob(updatedJob);

        if (updatedJob.status === 'ready' && readyDownloadUrl) {
          setDownloadUrl(readyDownloadUrl);

          // Charge 5 tokens only when the file is ready, so failed downloads cost nothing!
          if (!hasChargedToken) {
            setHasChargedToken(true);
            const deducted = await onCheckAndDeductTokens(
              5,
              'download',
              videoInfo.title || 'Video Download',
              `${updatedJob.qualityLabel} • ${videoInfo.platform.toUpperCase()}`
            );

            if (deducted) {
              onLogActivity?.(
                'download',
                videoInfo.title || 'Video Download',
                `${updatedJob.qualityLabel} ready • ${formatBytes(updatedJob.fileSize)}`
              );
            }
          }
        } else if (updatedJob.status === 'failed') {
          const errMsg =
            lang === 'km' && updatedJob.errorKm
              ? updatedJob.errorKm
              : updatedJob.error || 'Download failed';
          showToast(errMsg, 'error');
        }
      });
    } catch (err: any) {
      console.error('Start download error:', err);
      const msg = lang === 'km' && err.errorKm ? err.errorKm : err.message || 'Failed to start download';
      showToast(msg, 'error');
    } finally {
      setIsStartingDownload(false);
    }
  };

  const handleCopyLink = () => {
    if (!downloadUrl) return;
    const fullUrl = `${window.location.origin}${downloadUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    showToast(
      lang === 'km' ? 'បានចម្លង Link រួចរាល់' : 'Download link copied to clipboard',
      'success'
    );
  };

  const resetAll = () => {
    if (pollCleanupRef.current) pollCleanupRef.current();
    setUrl('');
    setVideoInfo(null);
    setActiveJob(null);
    setDownloadUrl(null);
    setDetectedPlatform(null);
    setHasChargedToken(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-khmer text-stone-900 tracking-tight flex items-center gap-2">
                {lang === 'km' ? 'ទាញយកវីដេអូពហុវេទិកា' : 'Social Video Downloader'}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  5 Tokens
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 font-khmer">
                {lang === 'km'
                  ? 'ទាញយកវីដេអូច្បាស់កម្រិត Full HD & 4K ពី TikTok, Douyin, Facebook, Pinterest & YouTube'
                  : 'Fast, high-resolution video downloader for TikTok, Douyin, Facebook, Pinterest & YouTube'}
              </p>
            </div>
          </div>
        </div>

        {/* Token Balance Indicator */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-100 border border-stone-200 text-xs font-mono">
          <Coins className="w-4 h-4 text-emerald-600" />
          <span className="text-stone-500">{lang === 'km' ? 'សមតុល្យ:' : 'Balance:'}</span>
          <span className="font-bold text-stone-900">{tokens.toLocaleString()} Tokens</span>
        </div>
      </div>

      {/* Supported Platforms Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-stone-400 font-khmer text-[11px] shrink-0 font-medium">
          {lang === 'km' ? 'គាំទ្រវេទិកា:' : 'Supported:'}
        </span>
        {PLATFORMS.map((p) => {
          const isSelected = detectedPlatform === p.id;
          return (
            <div
              key={p.id}
              className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 shrink-0 text-[11px] ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-xs ring-2 ring-emerald-500 ring-offset-1'
                  : 'bg-stone-100 text-stone-600 border border-stone-200/80'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-stone-400'}`} />
              <span>{p.name}</span>
            </div>
          );
        })}
      </div>

      {/* URL Input Box */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-3">
        <label className="block text-xs font-bold font-khmer text-stone-700">
          {lang === 'km' ? 'បិទភ្ជាប់តំណភ្ជាប់វីដេអូ (Video URL)' : 'Paste Video URL'}
        </label>
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
              placeholder={
                lang === 'km'
                  ? 'https://www.tiktok.com/@... ឬ https://youtu.be/...'
                  : 'https://www.tiktok.com/@... or https://youtu.be/...'
              }
              className="w-full pl-10 pr-24 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-sans focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
            />
            <LinkIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            
            <button
              type="button"
              onClick={handlePaste}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-khmer font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              {lang === 'km' ? 'Paste' : 'Paste'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleFetchInfo}
            disabled={isLoadingInfo || !url.trim()}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400 text-white font-khmer font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoadingInfo ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{lang === 'km' ? 'កំពុងស្វែងរក...' : 'Inspecting...'}</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>{lang === 'km' ? 'ស្វែងរកវីដេអូ' : 'Get Video'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video Info & Resolution Selector */}
      {videoInfo && (
        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-6 animate-fade-in">
          {/* Card Top: Thumbnail + Metadata */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {videoInfo.thumbnail && (
              <div className="relative rounded-2xl overflow-hidden w-full sm:w-56 shrink-0 aspect-video bg-stone-100 border border-stone-200 shadow-xs">
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-full h-full object-cover"
                />
                {videoInfo.duration && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-300" />
                    {formatDuration(videoInfo.duration)}
                  </span>
                )}
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-900 text-white">
                  {videoInfo.platform}
                </span>
                {videoInfo.author && (
                  <span className="text-xs text-stone-500 font-medium truncate">
                    @{videoInfo.author}
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-bold text-stone-900 line-clamp-2">
                {videoInfo.title}
              </h2>

              <p className="text-xs text-stone-500 font-khmer">
                {lang === 'km'
                  ? 'សូមជ្រើសរើសគុណភាព Resolution ដែលមានជាក់ស្ដែងខាងក្រោមដើម្បីទាញយក'
                  : 'Select from the video’s actual available resolutions below to download'}
              </p>
            </div>
          </div>

          {/* Resolutions Picker */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <label className="block text-xs font-bold font-khmer text-stone-700">
              {lang === 'km' ? 'គុណភាព / កម្រិតបង្ហាញ (Available Qualities):' : 'Available Qualities:'}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {videoInfo.qualities.map((q) => {
                const isSelected = selectedQuality === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedQuality(q.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                        : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-xl ${
                          q.isAudioOnly
                            ? 'bg-amber-100 text-amber-700'
                            : isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {q.isAudioOnly ? (
                          <Music className="w-4 h-4" />
                        ) : (
                          <Video className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 truncate">
                          {q.label}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          {q.ext.toUpperCase()}
                          {q.filesizeApprox ? ` • ~${formatBytes(q.filesizeApprox)}` : ''}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button & Token Notice */}
          {!activeJob && (
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-stone-100">
              <div className="flex items-center gap-2 text-xs font-khmer text-stone-500">
                <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {lang === 'km'
                    ? 'កាត់ 5 Tokens នៅពេលឯកសារទាញយករួចរាល់ (មិនគិតថ្លៃប្រសិនបើបរាជ័យ)'
                    : '5 Tokens charged only when file is ready (costs nothing if failed)'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartDownload}
                disabled={isStartingDownload || !selectedQuality}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-khmer font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
              >
                {isStartingDownload ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>{lang === 'km' ? 'កំពុងចាប់ផ្ដើម...' : 'Starting...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'km' ? 'ទាញយកឥឡូវនេះ (5 Tokens)' : 'Download Now (5 Tokens)'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Job Progress & Download Stage */}
      {activeJob && (
        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm sm:text-base text-stone-900 font-khmer">
                {lang === 'km' ? 'ដំណើរការទាញយក (Download Progress)' : 'Download Progress'}
              </h3>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold capitalize ${
                activeJob.status === 'ready'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : activeJob.status === 'failed'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {activeJob.status === 'ready'
                ? '✅ Ready'
                : activeJob.status === 'failed'
                ? '❌ Failed'
                : `⏳ ${activeJob.status}... ${activeJob.progress}%`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden border border-stone-200 relative">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                activeJob.status === 'ready'
                  ? 'bg-emerald-500'
                  : activeJob.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(5, activeJob.progress)}%` }}
            />
          </div>

          {/* Status Message / Error */}
          {activeJob.status === 'failed' && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-khmer flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{lang === 'km' ? 'ការទាញយកមិនជោគជ័យ' : 'Download Failed'}</p>
                <p className="text-red-700 mt-0.5">
                  {lang === 'km' && activeJob.errorKm ? activeJob.errorKm : activeJob.error}
                </p>
                <p className="text-[11px] text-red-600 mt-1">
                  {lang === 'km' ? 'គ្មានការកាត់ Token ឡើយ។' : 'No tokens were deducted.'}
                </p>
              </div>
            </div>
          )}

          {/* Ready State: Download Button & Actions */}
          {activeJob.status === 'ready' && downloadUrl && (
            <div className="pt-2 space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 font-khmer">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'km' ? 'វីដេអូរួចរាល់សម្រាប់ទាញយក!' : 'Video is ready to download!'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 font-mono truncate max-w-md">
                    {activeJob.fileName}
                    {activeJob.fileSize ? ` (${formatBytes(activeJob.fileSize)})` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={downloadUrl}
                    download={activeJob.fileName || 'video'}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-khmer font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{lang === 'km' ? 'រក្សាទុកឯកសារ (Save File)' : 'Save File'}</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-colors cursor-pointer"
                    title="Copy Link"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
                <span>⏱️ {lang === 'km' ? 'Link មានសុពលភាពរយៈពេល ១០ នាទី' : 'Link expires in 10 minutes'}</span>
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-stone-500 hover:text-stone-900 underline font-khmer cursor-pointer"
                >
                  {lang === 'km' ? 'ទាញយកវីដេអូផ្សេងទៀត' : 'Download another video'}
                </button>
              </div>
            </div>
          )}

          {activeJob.status === 'failed' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-khmer text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === 'km' ? 'សាកល្បងឡើងវិញ' : 'Try Again'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legal & Terms Notice */}
      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-500 text-xs font-khmer space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-stone-700">
          <ShieldAlert className="w-4 h-4 text-stone-500" />
          <span>{lang === 'km' ? 'សេចក្តីជូនដំណឹងអំពីការប្រើប្រាស់ (Legal Notice)' : 'Legal & Fair Use Notice'}</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          {lang === 'km'
            ? 'ឧបករណ៍នេះបង្កើតឡើងសម្រាប់តែការទាញយកមាតិកាដែលជាកម្មសិទ្ធិផ្ទាល់ខ្លួន ឬការរក្សាទុកបម្រុងទុក (Personal Backup/Fair Use) ប៉ុណ្ណោះ។ សូមគោរពកម្មសិទ្ធិបញ្ញា និងលក្ខខណ្ឌប្រើប្រាស់របស់វេទិកាដើមជានិច្ច។'
            : 'This tool is intended strictly for personal backup, offline viewing of your own creations, or non-commercial fair use. Please respect content creator copyrights and platform terms of service.'}
        </p>
      </div>
    </div>
  );
};
