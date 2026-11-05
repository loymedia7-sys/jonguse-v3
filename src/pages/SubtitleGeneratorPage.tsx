import React, { useState } from 'react';
import { Language, SubtitleSegment } from '../types';
import { translations } from '../lib/i18n';
import { generateSrt } from '../lib/api';
import { calculateSrtTokens } from '../data/plans';
import {
  parseSrt,
  segmentsToSrt,
  msToSrtTime,
  splitSegmentsToShortWords,
  adjustSegmentsSpeed,
  realignSegmentsTimecodes,
} from '../lib/subtitle';
import {
  FileText,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  Clock,
  Wand2,
  Video,
  ArrowRight,
  RefreshCw,
  AlignLeft,
  Zap,
  FastForward,
  Rewind,
  Scissors,
  Layers,
  Sliders,
} from 'lucide-react';

interface SubtitleGeneratorPageProps {
  lang?: Language;
  onLogActivity?: (tool: 'srt', title: string, summary?: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  onNavigateToVideoStyler?: (srtContent: string, segments: SubtitleSegment[]) => void;
  tokens?: number;
  onCheckAndDeductTokens?: (cost: number, tool: string, title: string, summary?: string) => Promise<boolean>;
}

export const SubtitleGeneratorPage: React.FC<SubtitleGeneratorPageProps> = ({
  lang = 'km',
  onLogActivity,
  showToast,
  onNavigateToVideoStyler,
  tokens,
  onCheckAndDeductTokens,
}) => {
  const t = (key: keyof typeof translations['km']) => {
    return translations[lang]?.[key] || translations['km'][key] || key;
  };

  const [script, setScript] = useState<string>('');
  const [speed, setSpeed] = useState<'ultra_fast' | 'fast' | 'normal' | 'slow'>('fast');
  const [chunkMode, setChunkMode] = useState<'short_punchy' | 'medium_short' | 'standard'>('short_punchy');
  const [maxChars, setMaxChars] = useState<number>(18);
  const [startOffset, setStartOffset] = useState<number>(0);
  const [translateTo, setTranslateTo] = useState<string>('none');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'interactive' | 'raw'>('interactive');
  const [copied, setCopied] = useState<boolean>(false);

  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [rawSrt, setRawSrt] = useState<string>('');

  const isKhmer = lang === 'km';
  const srtTokenEstimate = calculateSrtTokens(script, isKhmer);

  const handleApplyPreset = (preset: 'tiktok_fast' | 'dynamic' | 'standard' | 'cinematic') => {
    if (preset === 'tiktok_fast') {
      setSpeed('ultra_fast');
      setChunkMode('short_punchy');
      setMaxChars(16);
      if (showToast) showToast(lang === 'km' ? 'បានជ្រើសរើស Preset: ពាក្យខ្លីៗ + និយាយលឿន' : 'Applied TikTok Shorts Preset: Short Words + Fast Speak');
    } else if (preset === 'dynamic') {
      setSpeed('fast');
      setChunkMode('medium_short');
      setMaxChars(26);
      if (showToast) showToast(lang === 'km' ? 'បានជ្រើសរើស Preset: ឃ្លាខ្លី + លឿន' : 'Applied Fast Dynamic Preset');
    } else if (preset === 'standard') {
      setSpeed('normal');
      setChunkMode('standard');
      setMaxChars(38);
      if (showToast) showToast(lang === 'km' ? 'បានជ្រើសរើស Preset: ធម្មតា' : 'Applied Standard Voiceover Preset');
    } else if (preset === 'cinematic') {
      setSpeed('slow');
      setChunkMode('standard');
      setMaxChars(55);
      if (showToast) showToast(lang === 'km' ? 'បានជ្រើសរើស Preset: វែង' : 'Applied Cinematic Preset');
    }
  };

  const handleGenerate = async () => {
    if (!script.trim()) {
      setError(lang === 'km' ? 'សូមបញ្ចូល Script ឬអត្ថបទជាមុនសិន' : 'Please enter or paste your script first');
      return;
    }

    if (onCheckAndDeductTokens) {
      const allowed = await onCheckAndDeductTokens(
        srtTokenEstimate.tokens,
        'srt',
        `Subtitle SRT (${speed} - ${srtTokenEstimate.chars} chars)`,
        `${srtTokenEstimate.chars} chars, ${srtTokenEstimate.words} words • ${srtTokenEstimate.tierDescription}`
      );
      if (!allowed) return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await generateSrt({
        script: script.trim(),
        language: 'km',
        speed,
        chunkMode,
        maxCharsPerLine: maxChars,
        startTimeOffset: startOffset,
        translateTo,
      });

      if (res.success && res.segments) {
        setSegments(res.segments);
        setRawSrt(res.srt);

        if (onLogActivity) {
          onLogActivity(
            'srt',
            `Subtitle SRT (${res.segments.length} lines - ${speed})`,
            `${res.segments.length} subtitle segments generated in ${speed} mode`
          );
        }
        if (showToast) {
          showToast(t('srtGeneratedSuccess'));
        }
      } else {
        throw new Error('No subtitle segments returned');
      }
    } catch (err: any) {
      console.error('SRT error:', err);
      setError(err.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  // Quick Action: Split to 1-3 Words
  const handleSplitToShortWords = () => {
    if (segments.length === 0) return;
    const splitted = splitSegmentsToShortWords(segments, 16, 3);
    setSegments(splitted);
    setRawSrt(segmentsToSrt(splitted));
    if (showToast) {
      showToast(lang === 'km' ? `បានបំបែកជា ${splitted.length} ពាក្យខ្លីៗ (TikTok / Shorts Style)!` : `Split into ${splitted.length} short word segments!`);
    }
  };

  // Quick Action: Adjust Speed Multiplier
  const handleAdjustSpeed = (multiplier: number) => {
    if (segments.length === 0) return;
    const adjusted = adjustSegmentsSpeed(segments, multiplier);
    setSegments(adjusted);
    setRawSrt(segmentsToSrt(adjusted));
    if (showToast) {
      showToast(lang === 'km' ? `បានកែសម្រួលល្បឿន ${multiplier}x ជោគជ័យ!` : `Adjusted timecode speed by ${multiplier}x!`);
    }
  };

  // Quick Action: Realign Timings
  const handleRealign = () => {
    if (segments.length === 0) return;
    const targetWpm = speed === 'ultra_fast' ? 220 : speed === 'fast' ? 175 : 130;
    const realigned = realignSegmentsTimecodes(segments, startOffset * 1000, targetWpm);
    setSegments(realigned);
    setRawSrt(segmentsToSrt(realigned));
    if (showToast) {
      showToast(lang === 'km' ? 'បានរៀបចំ Timecode ឡើងវិញដោយស្វ័យប្រវត្ត!' : 'Realigned timecodes smoothly!');
    }
  };

  const handleUpdateSegment = (index: number, field: keyof SubtitleSegment, value: string) => {
    const updated = [...segments];
    updated[index] = { ...updated[index], [field]: value };
    setSegments(updated);
    setRawSrt(segmentsToSrt(updated));
  };

  const handleDeleteSegment = (index: number) => {
    const updated = segments.filter((_, idx) => idx !== index);
    const reindexed = updated.map((s, idx) => ({ ...s, id: idx + 1 }));
    setSegments(reindexed);
    setRawSrt(segmentsToSrt(reindexed));
  };

  const handleAddSegmentAfter = (index: number) => {
    const current = segments[index];
    const newId = index + 2;
    const newSegment: SubtitleSegment = {
      id: newId,
      startTime: current ? current.endTime : '00:00:00,000',
      endTime: current ? msToSrtTime(current.endMs + 1500) : '00:00:01,500',
      startMs: current ? current.endMs : 0,
      endMs: current ? current.endMs + 1500 : 1500,
      text: lang === 'km' ? 'ពាក្យថ្មី' : 'New short word',
    };

    const updated = [...segments.slice(0, index + 1), newSegment, ...segments.slice(index + 1)];
    const reindexed = updated.map((s, idx) => ({ ...s, id: idx + 1 }));
    setSegments(reindexed);
    setRawSrt(segmentsToSrt(reindexed));
  };

  const handleRawSrtChange = (newSrt: string) => {
    setRawSrt(newSrt);
    const parsed = parseSrt(newSrt);
    if (parsed.length > 0) {
      setSegments(parsed);
    }
  };

  const handleDownloadSrt = () => {
    const content = rawSrt || segmentsToSrt(segments);
    if (!content.trim()) return;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles_${speed}_${Date.now()}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (showToast) {
      showToast(
        lang === 'km'
          ? `បានទាញយកឯកសារ .SRT (${segments.length} ជួរ) រួចរាល់!`
          : `Downloaded .SRT file (${segments.length} lines) successfully!`
      );
    }
  };

  const handleCopy = () => {
    const content = rawSrt || segmentsToSrt(segments);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (showToast) {
      showToast(
        lang === 'km'
          ? 'បានចម្លងកូដ Subtitle .SRT រួចរាល់!'
          : 'Copied .SRT subtitle content to clipboard!'
      );
    }
  };

  const handleSendToStyler = () => {
    if (onNavigateToVideoStyler) {
      const currentSrt = rawSrt || segmentsToSrt(segments);
      onNavigateToVideoStyler(currentSrt, segments);
    }
  };

  // Calculate total duration in mm:ss
  const lastSegment = segments[segments.length - 1];
  const totalDurationSeconds = lastSegment ? Math.round(lastSegment.endMs / 1000) : 0;
  const durationMinutes = Math.floor(totalDurationSeconds / 60);
  const durationSecs = totalDurationSeconds % 60;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-khmer flex items-center gap-2">
              <span>{t('srtTitle')}</span>
            </h1>
            <p className="text-sm text-stone-500 font-khmer">
              {t('srtDesc')}
            </p>
          </div>
        </div>

        {/* 1-Click Fast Presets */}
        <div className="mt-4 pt-3 border-t border-stone-200/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-stone-700 font-khmer flex items-center gap-1 mr-1">
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            Preset ពេញនិយម:
          </span>

          <button
            onClick={() => handleApplyPreset('tiktok_fast')}
            className={`text-xs px-3 py-1.5 rounded-lg font-khmer transition-all flex items-center gap-1 border shadow-xs cursor-pointer ${
              speed === 'ultra_fast' && chunkMode === 'short_punchy'
                ? 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-sm'
                : 'bg-stone-100 text-stone-800 border-stone-200 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300'
            }`}
          >
            <span>TikTok / Shorts (ពាក្យខ្លីៗ + យ៉ាងលឿន)</span>
          </button>

          <button
            onClick={() => handleApplyPreset('dynamic')}
            className={`text-xs px-3 py-1.5 rounded-lg font-khmer transition-all flex items-center gap-1 border shadow-xs cursor-pointer ${
              speed === 'fast' && chunkMode === 'medium_short'
                ? 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-sm'
                : 'bg-stone-100 text-stone-800 border-stone-200 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300'
            }`}
          >
            <span>Fast Speak (ឃ្លាខ្លី + លឿន)</span>
          </button>

          <button
            onClick={() => handleApplyPreset('standard')}
            className={`text-xs px-3 py-1.5 rounded-lg font-khmer transition-all flex items-center gap-1 border shadow-xs cursor-pointer ${
              speed === 'normal' && chunkMode === 'standard'
                ? 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-sm'
                : 'bg-stone-100 text-stone-800 border-stone-200 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300'
            }`}
          >
            <span>ធម្មតា (Standard)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Script & Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-stone-800 font-khmer flex items-center gap-1.5">
                  <AlignLeft className="w-4 h-4 text-emerald-600" />
                  Script / អត្ថបទសន្ទនា
                </label>
                {script && (
                  <button
                    onClick={() => setScript('')}
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder={t('srtInputPlaceholder')}
                rows={7}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-khmer leading-relaxed resize-none transition-all placeholder:text-stone-400"
              />
              <div className="flex items-center justify-between text-xs text-stone-500 mt-1.5 font-khmer flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <span>{srtTokenEstimate.chars} {isKhmer ? 'តួអក្សរ' : 'chars'}</span>
                  <span>•</span>
                  <span>{srtTokenEstimate.words} {isKhmer ? 'ពាក្យ' : 'words'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-400 font-khmer">
                    {srtTokenEstimate.isOverBase
                      ? (isKhmer ? 'គិតតាមប្រវែង (>200 chars)' : 'Length scaled (>200 chars)')
                      : (isKhmer ? 'មូលដ្ឋាន (≤200 chars)' : 'Base (≤200 chars)')}
                  </span>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
                      srtTokenEstimate.isOverBase
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {srtTokenEstimate.tokens} Tokens
                  </span>
                </div>
              </div>

              {/* Dynamic notice if script exceeds 200 chars */}
              {srtTokenEstimate.isOverBase && (
                <div className="mt-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-khmer">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold">
                      {isKhmer ? 'Script លើសពី 200 តួអក្សរ:' : 'Script exceeds 200 chars:'}
                    </span>
                    <span>
                      {isKhmer
                        ? `គណនា ${srtTokenEstimate.tokens} Tokens (+10 Tokens រាល់ 200 តួអក្សរ)`
                        : `Calculated ${srtTokenEstimate.tokens} Tokens (+10 per 200 chars)`}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-md shrink-0 ml-2">
                    {srtTokenEstimate.tierDescription}
                  </span>
                </div>
              )}
            </div>

            {/* Pacing Speed (4 Options including Ultra Fast) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-khmer">
                  {t('srtPacing')}
                </label>
                <span className="text-[11px] font-mono text-emerald-700 font-bold">
                  {speed === 'ultra_fast' ? '~220 WPM (យ៉ាងលឿន)' : speed === 'fast' ? '~170 WPM (លឿន)' : speed === 'normal' ? '~130 WPM (មធ្យម)' : '~95 WPM (យឺត)'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'ultra_fast', label: 'យ៉ាងលឿន', desc: '220 WPM' },
                  { id: 'fast', label: 'លឿន', desc: '170 WPM' },
                  { id: 'normal', label: 'ធម្មតា', desc: '130 WPM' },
                  { id: 'slow', label: 'យឺត', desc: '95 WPM' },
                ].map((item) => {
                  const isSelected = speed === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSpeed(item.id as any)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-khmer border transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-sm'
                          : 'border-stone-200 bg-stone-50/70 text-stone-700 hover:bg-emerald-50 hover:border-emerald-200'
                      }`}
                    >
                      <div>{item.label}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-stone-400'}`}>
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chunk Mode / Segmentation Style */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-khmer">
                  {t('srtChunkMode')}
                </label>
                <span className="text-[11px] text-stone-500 font-khmer">
                  {maxChars} តួអក្សរ/បន្ទាត់
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mode: 'short_punchy', chars: 16, label: 'ពាក្យខ្លីៗ 1-3 ពាក្យ', desc: 'TikTok / Shorts' },
                  { mode: 'medium_short', chars: 26, label: 'ឃ្លាខ្លីល្មម', desc: '~26 តួអក្សរ' },
                  { mode: 'standard', chars: 45, label: 'ស្តង់ដារពេញ', desc: '~45 តួអក្សរ' },
                ].map((item) => {
                  const isSelected = chunkMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => {
                        setChunkMode(item.mode as any);
                        setMaxChars(item.chars);
                      }}
                      className={`px-2.5 py-2 rounded-xl text-xs font-khmer border transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-sm'
                          : 'border-stone-200 bg-stone-50/70 text-stone-700 hover:bg-emerald-50 hover:border-emerald-200'
                      }`}
                    >
                      <div className="line-clamp-1">{item.label}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-stone-400'}`}>
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Fine tuning slider */}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[11px] text-stone-500 font-khmer whitespace-nowrap">កម្រិតលំអិត:</span>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={maxChars}
                  onChange={(e) => setMaxChars(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="text-xs font-mono text-stone-700 w-8 text-right font-bold">{maxChars}</span>
              </div>
            </div>

            {/* Start Offset & Translation */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-khmer mb-1.5 block">
                  {t('srtStartOffset')} (s)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={startOffset}
                    onChange={(e) => setStartOffset(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-khmer mb-1.5 block">
                  បកប្រែ (Translate)
                </label>
                <select
                  value={translateTo}
                  onChange={(e) => setTranslateTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm font-khmer focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="none">ភាសាដើម (Original)</option>
                  <option value="Khmer">បកប្រែទៅ ខ្មែរ (Khmer)</option>
                  <option value="English">បកប្រែទៅ អង់គ្លេស (English)</option>
                </select>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-khmer border border-red-200">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !script.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm font-khmer shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>កំពុងបង្កើត Subtitle SRT ({speed})...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-emerald-200" />
                  <span>បង្កើត Subtitle (Short Words & Fast Speak)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-800/80 text-emerald-100 font-bold ml-1">
                    {srtTokenEstimate.tokens} Tokens
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Results & Interactive Timeline Editor */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex flex-col h-full min-h-[600px]">
            {/* Header & Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="flex p-1 bg-stone-100 rounded-xl">
                  <button
                    onClick={() => setActiveTab('interactive')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg font-khmer transition-all cursor-pointer ${
                      activeTab === 'interactive'
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {t('srtTabInteractive')}
                  </button>
                  <button
                    onClick={() => setActiveTab('raw')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg font-khmer transition-all cursor-pointer ${
                      activeTab === 'raw'
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {t('srtTabRaw')}
                  </button>
                </div>

                {segments.length > 0 && (
                  <div className="text-xs text-stone-500 font-khmer flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold font-mono">
                      {segments.length} ឃ្លា
                    </span>
                    <span className="font-mono">~{durationMinutes}m {durationSecs}s</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {segments.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-2 text-xs rounded-lg border border-stone-200 text-stone-700 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={t('srtCopyBtn')}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span className="hidden sm:inline font-khmer">{copied ? t('copied') : t('srtCopyBtn')}</span>
                  </button>

                  <button
                    onClick={handleDownloadSrt}
                    className="px-3 py-1.5 text-xs rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors flex items-center gap-1.5 font-khmer font-semibold shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>{t('srtDownloadBtn')}</span>
                  </button>

                  {onNavigateToVideoStyler && (
                    <button
                      onClick={handleSendToStyler}
                      className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 font-khmer font-bold shadow-xs cursor-pointer"
                      title={t('srtSendToStylerBtn')}
                    >
                      <Video className="w-4 h-4 text-white" />
                      <span>{t('srtSendToStylerBtn')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Interactive Timeline Quick Modifier Toolbar */}
            {segments.length > 0 && (
              <div className="mt-3 p-2.5 bg-stone-50 rounded-xl border border-stone-200/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-stone-500 font-khmer flex items-center gap-1 mr-1">
                    <Scissors className="w-3 h-3 text-amber-600" />
                    ឧបករណ៍កែសម្រួលរហ័ស:
                  </span>

                  <button
                    onClick={handleSplitToShortWords}
                    title="បំបែកឃ្លាវែងៗទៅជាពាក្យខ្លីៗ 1-3 ពាក្យ"
                    className="px-2.5 py-1 text-xs rounded-lg bg-white hover:bg-amber-50 hover:text-amber-900 text-stone-700 border border-stone-200 font-khmer transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>{t('srtSplitToWords')}</span>
                  </button>

                  <button
                    onClick={() => handleAdjustSpeed(1.5)}
                    title="បង្កើនល្បឿន Subtitle 1.5 ដង"
                    className="px-2 py-1 text-xs rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-khmer transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <FastForward className="w-3 h-3 text-emerald-600" />
                    <span>{t('srtSpeedUp15x')}</span>
                  </button>

                  <button
                    onClick={() => handleAdjustSpeed(2.0)}
                    title="បង្កើនល្បឿន Subtitle 2.0 ដង (Ultra Fast)"
                    className="px-2 py-1 text-xs rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-khmer transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <FastForward className="w-3 h-3 text-amber-600" />
                    <span>{t('srtSpeedUp20x')}</span>
                  </button>

                  <button
                    onClick={() => handleAdjustSpeed(0.8)}
                    title="បន្ថយល្បឿន 0.8 ដង"
                    className="px-2 py-1 text-xs rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-khmer transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Rewind className="w-3 h-3 text-emerald-600" />
                    <span>{t('srtSlowDown')}</span>
                  </button>
                </div>

                <button
                  onClick={handleRealign}
                  title="រៀបចំពេលវេលា Timecode ឡើងវិញដោយស្វ័យប្រវត្ត"
                  className="px-2.5 py-1 text-xs rounded-lg bg-stone-200/70 hover:bg-stone-200 text-stone-800 font-khmer transition-colors flex items-center gap-1"
                >
                  <Clock className="w-3 h-3 text-stone-600" />
                  <span>{t('srtRealignTimings')}</span>
                </button>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 mt-4">
              {segments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-16 text-center text-stone-400">
                  <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
                    <FileText className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <h3 className="text-base font-bold text-stone-700 font-khmer mb-1">
                    មិនទាន់មាន Subtitle នៅឡើយទេ
                  </h3>
                  <p className="text-xs text-stone-500 font-khmer max-w-sm">
                    បញ្ចូល Script នៅខាងឆ្វេង រួចចុច "បង្កើត Subtitle (Short Words & Fast Speak)" ឬជ្រើសរើស Preset ខាងលើ
                  </p>
                </div>
              ) : activeTab === 'interactive' ? (
                /* Interactive Timeline List */
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {segments.map((seg, index) => {
                    const wordCount = seg.text.trim().split(/\s+/).filter(Boolean).length;
                    const charCount = seg.text.length;
                    const durSec = ((seg.endMs - seg.startMs) / 1000).toFixed(2);

                    return (
                      <div
                        key={seg.id || index}
                        className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 hover:border-amber-300 transition-colors group space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-stone-200/80 text-stone-700 font-mono text-xs font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-xs text-stone-600">
                              <input
                                type="text"
                                value={seg.startTime}
                                onChange={(e) => handleUpdateSegment(index, 'startTime', e.target.value)}
                                className="w-24 px-1.5 py-0.5 bg-white border border-stone-200 rounded text-center focus:ring-1 focus:ring-amber-500"
                              />
                              <span className="text-stone-400">➔</span>
                              <input
                                type="text"
                                value={seg.endTime}
                                onChange={(e) => handleUpdateSegment(index, 'endTime', e.target.value)}
                                className="w-24 px-1.5 py-0.5 bg-white border border-stone-200 rounded text-center focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200/60 text-stone-600">
                              {durSec}s
                            </span>
                            {wordCount <= 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold font-khmer">
                                ខ្លី {wordCount} ពាក្យ
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleAddSegmentAfter(index)}
                              className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
                              title="បន្ថែមបន្ទាត់ខាងក្រោម"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSegment(index)}
                              className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="លុបបន្ទាត់"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <textarea
                          value={seg.text}
                          onChange={(e) => handleUpdateSegment(index, 'text', e.target.value)}
                          rows={1}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-stone-200 text-sm font-khmer leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-medium"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Raw SRT Code View */
                <div className="h-[520px]">
                  <textarea
                    value={rawSrt}
                    onChange={(e) => handleRawSrtChange(e.target.value)}
                    className="w-full h-full p-4 rounded-xl bg-stone-900 text-emerald-400 font-mono text-xs leading-relaxed border border-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                    placeholder="1\n00:00:01,000 --> 00:00:02,000\nពាក្យខ្លីៗ...\n\n"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
