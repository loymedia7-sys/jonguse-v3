import { SubtitleSegment, SubtitleStyleConfig, SubtitlePreset } from '../types';

/**
 * Converts milliseconds to standard SRT timestamp format: HH:MM:SS,mmm
 */
export function msToSrtTime(ms: number): string {
  const safeMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(safeMs / 3600000);
  const minutes = Math.floor((safeMs % 3600000) / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const millis = Math.floor(safeMs % 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

/**
 * Converts SRT timestamp string (e.g. "00:01:23,456" or "00:01:23.456") to milliseconds
 */
export function srtTimeToMs(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().replace('.', ',');
  const parts = cleaned.split(':');
  if (parts.length < 2) return 0;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let millis = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    const secParts = parts[2].split(',');
    seconds = parseInt(secParts[0], 10) || 0;
    millis = parseInt((secParts[1] || '0').padEnd(3, '0').slice(0, 3), 10) || 0;
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10) || 0;
    const secParts = parts[1].split(',');
    seconds = parseInt(secParts[0], 10) || 0;
    millis = parseInt((secParts[1] || '0').padEnd(3, '0').slice(0, 3), 10) || 0;
  }

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + millis;
}

/**
 * Parses raw SRT string into SubtitleSegment array
 */
export function parseSrt(srtContent: string): SubtitleSegment[] {
  if (!srtContent || !srtContent.trim()) return [];

  // Normalize line breaks
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const blocks = normalized.split(/\n\n+/);
  const segments: SubtitleSegment[] = [];

  blocks.forEach((block, index) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex === -1) return;

    const timeLine = lines[timeLineIndex];
    const timeParts = timeLine.split('-->');
    if (timeParts.length !== 2) return;

    const startTimeStr = timeParts[0].trim();
    const endTimeStr = timeParts[1].trim();

    const startMs = srtTimeToMs(startTimeStr);
    const endMs = srtTimeToMs(endTimeStr);

    const textLines = lines.slice(timeLineIndex + 1);
    const text = textLines.join('\n');

    segments.push({
      id: index + 1,
      startTime: msToSrtTime(startMs),
      endTime: msToSrtTime(endMs),
      startMs,
      endMs,
      text,
    });
  });

  return segments;
}

/**
 * Serializes SubtitleSegment array to standard .SRT string
 */
export function segmentsToSrt(segments: SubtitleSegment[]): string {
  return segments
    .map((seg, idx) => {
      const num = idx + 1;
      const start = seg.startTime || msToSrtTime(seg.startMs);
      const end = seg.endTime || msToSrtTime(seg.endMs);
      return `${num}\n${start} --> ${end}\n${seg.text}\n`;
    })
    .join('\n');
}

/**
 * Predefined Subtitle Style Presets
 */
export const SUBTITLE_PRESETS: Record<SubtitlePreset, SubtitleStyleConfig> = {
  bold_pop_viral: {
    preset: 'bold_pop_viral',
    fontFamily: 'Kantumruy Pro',
    fontSize: 36,
    fontWeight: '800',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 6,
    shadowColor: 'rgba(0,0,0,0.95)',
    shadowBlur: 10,
    depth3D: 4,
    depthColor: '#000000',
    rotationAngle: -2.5,
    dynamicTilt: true,
    bgColor: '#000000',
    bgOpacity: 0,
    bgPaddingX: 16,
    bgPaddingY: 8,
    bgRadius: 8,
    boxStyle: 'none',
    positionY: 80,
    textAlign: 'center',
    letterSpacing: 0.8,
    lineHeight: 1.3,
    textTransform: 'none',
    animation: 'rotate_pop',
    highlightWords: true,
    highlightColor: '#FFE600',
    calloutEmoji: '⚡',
  },
  karaoke_gold_sweep: {
    preset: 'karaoke_gold_sweep',
    fontFamily: 'Battambang',
    fontSize: 34,
    fontWeight: '700',
    textColor: '#FFFFFF',
    strokeColor: '#0F172A',
    strokeWidth: 5,
    shadowColor: '#F59E0B',
    shadowBlur: 16,
    depth3D: 2,
    depthColor: '#451A03',
    rotationAngle: 0,
    dynamicTilt: false,
    bgColor: '#090D16',
    bgOpacity: 0.75,
    bgPaddingX: 22,
    bgPaddingY: 10,
    bgRadius: 12,
    boxStyle: 'rounded_box',
    positionY: 82,
    textAlign: 'center',
    letterSpacing: 0.8,
    lineHeight: 1.35,
    textTransform: 'none',
    animation: 'karaoke_active',
    highlightWords: true,
    highlightColor: '#FBBF24',
    calloutEmoji: '🎙️',
  },
  cyber_neon_glow: {
    preset: 'cyber_neon_glow',
    fontFamily: 'Moul',
    fontSize: 32,
    fontWeight: '400',
    textColor: '#FFFFFF',
    strokeColor: '#083344',
    strokeWidth: 4,
    shadowColor: '#06B6D4',
    shadowBlur: 22,
    depth3D: 3,
    depthColor: '#083344',
    rotationAngle: 0,
    dynamicTilt: false,
    bgColor: '#020617',
    bgOpacity: 0.85,
    bgPaddingX: 24,
    bgPaddingY: 10,
    bgRadius: 14,
    boxStyle: 'glassmorphism',
    positionY: 82,
    textAlign: 'center',
    letterSpacing: 1.2,
    lineHeight: 1.3,
    textTransform: 'none',
    animation: 'glow_pulse',
    highlightWords: true,
    highlightColor: '#22D3EE',
    calloutEmoji: '✨',
  },
  boxed_pill_highlight: {
    preset: 'boxed_pill_highlight',
    fontFamily: 'Koulen',
    fontSize: 36,
    fontWeight: '700',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 5,
    shadowColor: 'rgba(0,0,0,0.85)',
    shadowBlur: 8,
    depth3D: 4,
    depthColor: '#000000',
    rotationAngle: -2,
    dynamicTilt: true,
    bgColor: '#000000',
    bgOpacity: 0.8,
    bgPaddingX: 20,
    bgPaddingY: 10,
    bgRadius: 999,
    boxStyle: 'pill',
    positionY: 80,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 1.3,
    textTransform: 'none',
    animation: 'pop',
    highlightWords: true,
    highlightColor: '#FFE600',
    calloutEmoji: '⚡',
  },
  minimal_modern: {
    preset: 'minimal_modern',
    fontFamily: 'Kantumruy Pro',
    fontSize: 30,
    fontWeight: '600',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 3,
    shadowColor: 'rgba(0,0,0,0.85)',
    shadowBlur: 8,
    depth3D: 0,
    rotationAngle: 0,
    dynamicTilt: false,
    bgColor: '#000000',
    bgOpacity: 0,
    bgPaddingX: 16,
    bgPaddingY: 8,
    bgRadius: 8,
    boxStyle: 'none',
    positionY: 86,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 1.4,
    textTransform: 'none',
    animation: 'fade_slide',
    highlightWords: false,
    calloutEmoji: '🎬',
  },
  flame_amber_pop: {
    preset: 'flame_amber_pop',
    fontFamily: 'Koulen',
    fontSize: 36,
    fontWeight: '800',
    textColor: '#FFFFFF',
    strokeColor: '#7C2D12',
    strokeWidth: 6,
    shadowColor: '#EA580C',
    shadowBlur: 16,
    depth3D: 5,
    depthColor: '#451A03',
    rotationAngle: 2,
    dynamicTilt: true,
    bgColor: '#451A03',
    bgOpacity: 0,
    bgPaddingX: 20,
    bgPaddingY: 10,
    bgRadius: 12,
    boxStyle: 'none',
    positionY: 80,
    textAlign: 'center',
    letterSpacing: 1.2,
    lineHeight: 1.3,
    textTransform: 'none',
    animation: 'bounce',
    highlightWords: true,
    highlightColor: '#F97316',
    calloutEmoji: '🔥',
  },
  tiktok_yellow: {
    preset: 'tiktok_yellow',
    fontFamily: 'Koulen',
    fontSize: 36,
    fontWeight: '700',
    textColor: '#FFE600',
    strokeColor: '#000000',
    strokeWidth: 6,
    shadowColor: 'rgba(0,0,0,0.85)',
    shadowBlur: 8,
    depth3D: 4,
    depthColor: '#000000',
    rotationAngle: -2,
    dynamicTilt: true,
    bgColor: '#000000',
    bgOpacity: 0,
    bgPaddingX: 16,
    bgPaddingY: 8,
    bgRadius: 8,
    boxStyle: 'none',
    positionY: 80,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 1.3,
    textTransform: 'none',
    animation: 'rotate_pop',
    calloutEmoji: '🔥',
  },
  hormozi_green: {
    preset: 'hormozi_green',
    fontFamily: 'Koulen',
    fontSize: 38,
    fontWeight: '900',
    textColor: '#22C55E',
    strokeColor: '#000000',
    strokeWidth: 7,
    shadowColor: 'rgba(0,0,0,0.95)',
    shadowBlur: 6,
    depth3D: 6,
    depthColor: '#052E16',
    rotationAngle: -3,
    dynamicTilt: true,
    bgColor: '#022C22',
    bgOpacity: 0,
    bgPaddingX: 18,
    bgPaddingY: 10,
    bgRadius: 10,
    boxStyle: 'none',
    positionY: 78,
    textAlign: 'center',
    letterSpacing: 1.2,
    lineHeight: 1.25,
    textTransform: 'none',
    animation: 'pop',
    highlightWords: true,
    highlightColor: '#4ADE80',
    calloutEmoji: '⚡',
  },
  mrbeast_pop: {
    preset: 'mrbeast_pop',
    fontFamily: 'Koulen',
    fontSize: 38,
    fontWeight: '900',
    textColor: '#FFD700',
    strokeColor: '#DC2626',
    strokeWidth: 7,
    shadowColor: 'rgba(0,0,0,0.9)',
    shadowBlur: 10,
    depth3D: 5,
    depthColor: '#7F1D1D',
    rotationAngle: 2,
    dynamicTilt: true,
    bgColor: '#000000',
    bgOpacity: 0,
    bgPaddingX: 20,
    bgPaddingY: 10,
    bgRadius: 12,
    boxStyle: 'none',
    positionY: 78,
    textAlign: 'center',
    letterSpacing: 1.2,
    lineHeight: 1.3,
    textTransform: 'none',
    animation: 'bounce',
    calloutEmoji: '😱',
  },
  gradient_sticker: {
    preset: 'gradient_sticker',
    fontFamily: 'Koulen',
    fontSize: 34,
    fontWeight: '700',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 4,
    shadowColor: 'rgba(124,58,237,0.7)',
    shadowBlur: 14,
    depth3D: 3,
    depthColor: '#4C1D95',
    rotationAngle: -3,
    dynamicTilt: true,
    bgColor: '#7C3AED',
    bgSecondaryColor: '#EC4899',
    bgOpacity: 0.95,
    bgPaddingX: 24,
    bgPaddingY: 12,
    bgRadius: 999,
    boxStyle: 'gradient_pill',
    positionY: 82,
    textAlign: 'center',
    letterSpacing: 1.2,
    lineHeight: 1.3,
    textTransform: 'none',
    animation: 'rotate_pop',
    calloutEmoji: '✨',
  },
  rotated_badge: {
    preset: 'rotated_badge',
    fontFamily: 'Battambang',
    fontSize: 32,
    fontWeight: '700',
    textColor: '#09090B',
    strokeColor: '#FFFFFF',
    strokeWidth: 2,
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowBlur: 8,
    depth3D: 4,
    depthColor: '#B45309',
    rotationAngle: -4,
    dynamicTilt: false,
    bgColor: '#FBBF24',
    bgOpacity: 0.95,
    bgPaddingX: 24,
    bgPaddingY: 10,
    bgRadius: 10,
    boxStyle: 'angled_badge',
    positionY: 82,
    textAlign: 'center',
    letterSpacing: 0.8,
    lineHeight: 1.35,
    textTransform: 'none',
    animation: 'pop',
    calloutEmoji: '💡',
  },
  battambang_bold: {
    preset: 'battambang_bold',
    fontFamily: 'Battambang',
    fontSize: 30,
    fontWeight: '700',
    textColor: '#FFFFFF',
    strokeColor: '#0F172A',
    strokeWidth: 5,
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowBlur: 6,
    depth3D: 0,
    rotationAngle: 0,
    dynamicTilt: false,
    bgColor: '#0F172A',
    bgOpacity: 0.75,
    bgPaddingX: 20,
    bgPaddingY: 10,
    bgRadius: 10,
    boxStyle: 'rounded_box',
    positionY: 84,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 1.4,
    textTransform: 'none',
    animation: 'none',
  },
  koulen_gold: {
    preset: 'koulen_gold',
    fontFamily: 'Koulen',
    fontSize: 36,
    fontWeight: '700',
    textColor: '#FBBF24',
    strokeColor: '#451A03',
    strokeWidth: 6,
    shadowColor: 'rgba(251,191,36,0.6)',
    shadowBlur: 14,
    depth3D: 4,
    depthColor: '#451A03',
    rotationAngle: 0,
    dynamicTilt: false,
    bgColor: '#1E1B4B',
    bgOpacity: 0.85,
    bgPaddingX: 24,
    bgPaddingY: 10,
    bgRadius: 12,
    boxStyle: 'pill',
    positionY: 80,
    textAlign: 'center',
    letterSpacing: 1.5,
    lineHeight: 1.3,
    textTransform: 'none',
    animation: 'glow_pulse',
  },
  cinematic_white: {
    preset: 'cinematic_white',
    fontFamily: 'Bayon',
    fontSize: 32,
    fontWeight: '700',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 4,
    shadowColor: 'rgba(0,0,0,0.9)',
    shadowBlur: 12,
    depth3D: 0,
    rotationAngle: 0,
    dynamicTilt: false,
    bgColor: '#000000',
    bgOpacity: 0,
    bgPaddingX: 18,
    bgPaddingY: 8,
    bgRadius: 6,
    boxStyle: 'none',
    positionY: 88,
    textAlign: 'center',
    letterSpacing: 2,
    lineHeight: 1.4,
    textTransform: 'none',
    animation: 'fade_slide',
  },
  boxed_dark: {
    preset: 'boxed_dark',
    fontFamily: 'Kantumruy Pro',
    fontSize: 28,
    fontWeight: '600',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 0,
    shadowColor: 'transparent',
    shadowBlur: 0,
    depth3D: 0,
    rotationAngle: 0,
    dynamicTilt: false,
    bgColor: '#09090B',
    bgOpacity: 0.85,
    bgPaddingX: 22,
    bgPaddingY: 10,
    bgRadius: 10,
    boxStyle: 'rounded_box',
    positionY: 85,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 1.4,
    textTransform: 'none',
    animation: 'none',
  },
  neon_cyan: {
    preset: 'neon_cyan',
    fontFamily: 'Siemreap',
    fontSize: 34,
    fontWeight: '700',
    textColor: '#22D3EE',
    strokeColor: '#083344',
    strokeWidth: 5,
    shadowColor: '#06B6D4',
    shadowBlur: 18,
    depth3D: 3,
    depthColor: '#083344',
    rotationAngle: 0,
    dynamicTilt: false,
    bgColor: '#020617',
    bgOpacity: 0.85,
    bgPaddingX: 22,
    bgPaddingY: 10,
    bgRadius: 12,
    boxStyle: 'glassmorphism',
    positionY: 82,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 1.3,
    textTransform: 'none',
    animation: 'glow_pulse',
    calloutEmoji: '🚀',
  },
  karaoke_pink: {
    preset: 'karaoke_pink',
    fontFamily: 'Koulen',
    fontSize: 34,
    fontWeight: '700',
    textColor: '#F43F5E',
    strokeColor: '#FFE4E6',
    strokeWidth: 4,
    shadowColor: 'rgba(244,63,94,0.7)',
    shadowBlur: 14,
    depth3D: 3,
    depthColor: '#4C0519',
    rotationAngle: 0,
    dynamicTilt: false,
    bgColor: '#4C0519',
    bgOpacity: 0.9,
    bgPaddingX: 24,
    bgPaddingY: 12,
    bgRadius: 999,
    boxStyle: 'pill',
    positionY: 82,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 1.3,
    textTransform: 'none',
    animation: 'karaoke_active',
    highlightWords: true,
    highlightColor: '#FFE4E6',
    calloutEmoji: '🎯',
  },
  minimal_clean: {
    preset: 'minimal_clean',
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 26,
    fontWeight: '600',
    textColor: '#F8FAFC',
    strokeColor: '#000000',
    strokeWidth: 3,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 4,
    depth3D: 0,
    rotationAngle: 0,
    dynamicTilt: false,
    bgColor: '#000000',
    bgOpacity: 0,
    bgPaddingX: 14,
    bgPaddingY: 6,
    bgRadius: 6,
    boxStyle: 'none',
    positionY: 86,
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 1.4,
    textTransform: 'none',
    animation: 'none',
  },
};

export const KHMER_FONTS = [
  { id: 'Battambang', name: 'Battambang (បាត់ដំបង)', category: 'Modern Clean' },
  { id: 'Koulen', name: 'Koulen (គូលែន - Bold Display)', category: 'Poster / Viral' },
  { id: 'Bayon', name: 'Bayon (បាយ័ន - Elegant)', category: 'Cinematic' },
  { id: 'Siemreap', name: 'Siemreap (សៀមរាប)', category: 'Modern Sans' },
  { id: 'Kantumruy Pro', name: 'Kantumruy Pro (កន្ទុំរុយ)', category: 'Smooth Modern' },
  { id: 'Moul', name: 'Moul (មូល - Classical Header)', category: 'Traditional' },
  { id: 'Preahvihear', name: 'Preahvihear (ព្រះវិហារ)', category: 'Decorative' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (English)', category: 'Clean Sans' },
];

/**
 * Sample Khmer and English scripts for instant 1-click testing
 */
export const SAMPLE_SCRIPTS = [
  {
    titleKm: 'TikTok / Shorts និយាយលឿន (Short Words + Fast Speak)',
    titleEn: 'TikTok / Shorts Fast Viral Hook (1-3 Words)',
    content: `ឈប់សិន!
តើអ្នកដឹងទេ?
AI អាចកាត់ Subtitle ខ្លីៗ
និងលឿនដូចរន្ទះ!
ត្រឹមតែ ១ វិនាទី
ប្រើបានភ្លាមៗ
ឥតគិតថ្លៃ ១០០%
សាកល្បងឥឡូវនេះ!`,
  },
  {
    titleKm: 'វីដេអូខ្លី TikTok / Reels ស្វាគមន៍',
    titleEn: 'Short TikTok / Reels Greeting',
    content: `សួស្តីបងប្អូនទាំងអស់គ្នា!
សូមស្វាគមន៍មកកាន់កម្មវិធី ចង់ប្រើ (Jong Use)។
ថ្ងៃនេះយើងនឹងបង្ហាញវិធីបង្កើត Subtitle ស្អាតៗ និងងាយស្រួលបំផុត។
កុំភ្លេចចុច Follow និង Like ម្នាក់មួយផងណា!`,
  },
  {
    titleKm: 'ព័ត៌មានបច្ចេកវិទ្យា & AI',
    titleEn: 'Technology & AI News Story',
    content: `បញ្ញាសិប្បនិម្មិត (AI) កំពុងផ្លាស់ប្តូររបៀបដែលមនុស្សធ្វើការទូទាំងពិភពលោក។
ពីការបង្កើតវីដេអូ រហូតដល់ការសរសេរកូដ និងការបកប្រែភាសា។
នៅកម្ពុជា អ្នកបង្កើតមាតិកាវ័យក្មេងកាន់តែច្រើនកំពុងចាប់យកបច្ចេកវិទ្យានេះ។
ដើម្បីបង្កើតស្នាដៃប្លែកៗ និងមានគុណភាពខ្ពស់។`,
  },
  {
    titleKm: 'Fast Motivational Voiceover (English & Khmer)',
    titleEn: 'Fast Motivational Voiceover (English & Khmer)',
    content: `Stop waiting!
The time is now.
Take massive action today.
Don't let anyone doubt your dreams.
Move fast and build!
ជោគជ័យមិនមែនរង់ចាំសំណាងទេ
គឺកើតចេញពីការតស៊ូ
ធ្វើវាឥឡូវនេះ!`,
  },
  {
    titleKm: 'ប្រាសាទអង្គរវត្ត Khmer Heritage',
    titleEn: 'Angkor Wat Travel Vlog Intro',
    content: `ប្រាសាទអង្គរវត្ត គឺជាសម្បត្តិបេតិកភណ្ឌពិភពលោកដ៏អស្ចារ្យបំផុតរបស់កម្ពុជា។
ទិដ្ឋភាពថ្ងៃរះនៅទីនេះពិតជាស្រស់ស្អាតរកកន្លែងប្រៀបមិនបានឡើយ។
សូមអញ្ជើញមកទស្សនាកម្ពុជា ដើម្បីស្វែងយល់ពីប្រវត្តិសាស្ត្រ និងវប្បធម៌ដ៏សម្បូរបែប។`,
  },
];

/**
 * Splits existing subtitle segments into short punchy 1-3 word segments (TikTok / Shorts style)
 * with proportionally distributed timecodes.
 */
export function splitSegmentsToShortWords(
  segments: SubtitleSegment[],
  maxChars = 15,
  maxWords = 3
): SubtitleSegment[] {
  if (!segments || segments.length === 0) return [];

  const newSegments: SubtitleSegment[] = [];
  let nextId = 1;

  for (const seg of segments) {
    const text = seg.text.trim();
    const duration = Math.max(300, seg.endMs - seg.startMs);

    // Split text into tokens / words / phrases
    // Handle both space-separated (English / spaced Khmer) and punctuation-separated
    let tokens: string[] = [];
    if (text.includes(' ') || text.includes('\n')) {
      tokens = text.split(/[\s\n]+/).filter(Boolean);
    } else {
      // Chunk Khmer unbroken text every 12-16 chars or punctuation
      const chunks: string[] = [];
      const parts = text.split(/([។.!?,\s]+)/).filter(Boolean);
      for (const part of parts) {
        if (part.length <= maxChars) {
          chunks.push(part);
        } else {
          for (let i = 0; i < part.length; i += maxChars) {
            chunks.push(part.slice(i, i + maxChars));
          }
        }
      }
      tokens = chunks.filter(Boolean);
    }

    if (tokens.length <= 1) {
      // Keep single short segment
      newSegments.push({
        id: nextId++,
        startTime: msToSrtTime(seg.startMs),
        endTime: msToSrtTime(seg.endMs),
        startMs: seg.startMs,
        endMs: seg.endMs,
        text: seg.text,
      });
      continue;
    }

    // Group tokens into batches of 1-3 words or maxChars
    const groupedLines: string[] = [];
    let currentGroup: string[] = [];
    let currentLen = 0;

    for (const tok of tokens) {
      if (currentGroup.length >= maxWords || (currentLen + tok.length > maxChars && currentGroup.length > 0)) {
        groupedLines.push(currentGroup.join(' '));
        currentGroup = [tok];
        currentLen = tok.length;
      } else {
        currentGroup.push(tok);
        currentLen += tok.length;
      }
    }
    if (currentGroup.length > 0) {
      groupedLines.push(currentGroup.join(' '));
    }

    // Allocate time proportionally based on character length
    const totalChars = groupedLines.reduce((sum, line) => sum + Math.max(1, line.length), 0);
    let curStartMs = seg.startMs;

    groupedLines.forEach((line, idx) => {
      const lineChars = Math.max(1, line.length);
      const isLast = idx === groupedLines.length - 1;
      const subDuration = isLast
        ? Math.max(250, seg.endMs - curStartMs)
        : Math.max(250, Math.round((lineChars / totalChars) * duration));

      const subEndMs = isLast ? seg.endMs : curStartMs + subDuration;

      newSegments.push({
        id: nextId++,
        startTime: msToSrtTime(curStartMs),
        endTime: msToSrtTime(subEndMs),
        startMs: curStartMs,
        endMs: subEndMs,
        text: line.trim(),
      });

      curStartMs = subEndMs;
    });
  }

  return newSegments;
}

/**
 * Adjusts playback speed / pacing of all segments by multiplier
 * speedMultiplier > 1.0 (e.g. 1.5x) makes speaking faster and duration shorter.
 */
export function adjustSegmentsSpeed(
  segments: SubtitleSegment[],
  speedMultiplier: number
): SubtitleSegment[] {
  if (!segments || segments.length === 0 || speedMultiplier <= 0) return segments;

  const firstStart = segments[0].startMs || 0;
  let runningMs = firstStart;
  const pauseGap = Math.round(120 / speedMultiplier);

  return segments.map((seg, index) => {
    const origDuration = Math.max(250, seg.endMs - seg.startMs);
    const newDuration = Math.max(200, Math.round(origDuration / speedMultiplier));
    const startMs = runningMs;
    const endMs = startMs + newDuration;

    runningMs = endMs + pauseGap;

    return {
      id: index + 1,
      startTime: msToSrtTime(startMs),
      endTime: msToSrtTime(endMs),
      startMs,
      endMs,
      text: seg.text,
    };
  });
}

/**
 * Realigns subtitle timecodes sequentially with clean gaps
 */
export function realignSegmentsTimecodes(
  segments: SubtitleSegment[],
  startOffsetMs = 0,
  wordsPerMin = 180
): SubtitleSegment[] {
  if (!segments || segments.length === 0) return [];

  let curMs = Math.max(0, startOffsetMs);
  const msPerChar = Math.max(35, Math.min(90, Math.round(60000 / (wordsPerMin * 5.5))));

  return segments.map((seg, index) => {
    const charCount = seg.text.length;
    const durMs = Math.max(400, Math.round(charCount * msPerChar));
    const startMs = curMs;
    const endMs = startMs + durMs;

    curMs = endMs + 100; // 100ms rapid gap

    return {
      id: index + 1,
      startTime: msToSrtTime(startMs),
      endTime: msToSrtTime(endMs),
      startMs,
      endMs,
      text: seg.text,
    };
  });
}

export interface DrawSubtitleTiming {
  currentMs?: number;
  startMs?: number;
  endMs?: number;
  segmentIndex?: number;
}

/**
 * Draws styled subtitles directly on an HTML5 canvas with real-time animations,
 * 3D extrusion, modern angled badges, gradient pills, and karaoke active-word highlights.
 */
export function drawStyledSubtitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  config: SubtitleStyleConfig,
  timing?: DrawSubtitleTiming
) {
  if (!text || !text.trim()) return;

  const lines = text.split('\n');
  const scale = width / 1280; // Relative scaling factor based on 720p/1080p canvas width
  const effectiveFontSize = Math.max(18, Math.round(config.fontSize * scale));
  const effectiveLineHeight = effectiveFontSize * (config.lineHeight || 1.3);

  // Time & Progress calculations
  const curMs = timing?.currentMs ?? 0;
  const sMs = timing?.startMs ?? 0;
  const eMs = timing?.endMs ?? (sMs + 2000);
  const segIndex = timing?.segmentIndex ?? 0;
  const durationMs = Math.max(200, eMs - sMs);
  const elapsedMs = Math.max(0, curMs - sMs);
  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));

  // Determine base rotation angle
  let rotationDeg = config.rotationAngle || 0;
  if (config.dynamicTilt) {
    // Alternating TikTok/Shorts energetic tilt
    const baseTilt = segIndex % 2 === 0 ? -3.5 : 3.5;
    rotationDeg = baseTilt + (config.rotationAngle || 0);
  }

  // Animation Transforms
  let animScale = 1.0;
  let animOffsetY = 0;
  let animAlpha = 1.0;
  let extraTilt = 0;
  let pulseBlur = config.shadowBlur || 0;

  const animType = config.animation || 'none';

  if (animType === 'pop' || animType === 'rotate_pop') {
    // Spring pop animation on entrance (first 280ms)
    const t = Math.min(1, elapsedMs / 280);
    if (t < 1) {
      // Spring elastic overshoot curve
      animScale = 0.82 + Math.sin(t * Math.PI) * 0.28 + (t * 0.18);
      if (animType === 'rotate_pop') {
        extraTilt = Math.sin((1 - t) * Math.PI) * (segIndex % 2 === 0 ? -5 : 5);
      }
    }
  } else if (animType === 'bounce') {
    // Bouncy punch down
    const t = Math.min(1, elapsedMs / 320);
    if (t < 1) {
      animOffsetY = -28 * Math.cos(t * Math.PI * 1.5) * (1 - t) * scale;
      animScale = 0.9 + Math.sin(t * Math.PI) * 0.18;
    }
  } else if (animType === 'wobble') {
    // Continuous harmonic float & wobble
    extraTilt = Math.sin(curMs * 0.007) * 2.2;
    animOffsetY = Math.cos(curMs * 0.005) * 4 * scale;
  } else if (animType === 'glow_pulse') {
    // Pulsating neon glow
    pulseBlur = (config.shadowBlur || 12) * (1 + 0.45 * Math.sin(curMs * 0.008));
  } else if (animType === 'fade_slide') {
    // Smooth upward slide & fade
    const t = Math.min(1, elapsedMs / 220);
    animAlpha = Math.min(1, Math.max(0.1, t));
    animOffsetY = (1 - t) * 16 * scale;
  }

  ctx.save();
  ctx.globalAlpha = animAlpha;

  // Base position
  const posX = config.textAlign === 'left' ? width * 0.1 : config.textAlign === 'right' ? width * 0.9 : width / 2;
  const posY = (height * config.positionY) / 100 + animOffsetY;

  // Apply centered translation for Rotation & Scale
  ctx.translate(posX, posY);
  const totalAngleRad = ((rotationDeg + extraTilt) * Math.PI) / 180;
  if (totalAngleRad !== 0) {
    ctx.rotate(totalAngleRad);
  }
  if (animScale !== 1.0) {
    ctx.scale(animScale, animScale);
  }

  // Set font for measuring
  ctx.font = `${config.fontWeight || '700'} ${effectiveFontSize}px "${config.fontFamily}", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure text block dimensions
  let maxLineWidth = 0;
  lines.forEach(line => {
    const metrics = ctx.measureText(line);
    if (metrics.width > maxLineWidth) maxLineWidth = metrics.width;
  });

  const totalTextHeight = lines.length * effectiveLineHeight;
  const startY = -totalTextHeight / 2 + effectiveLineHeight / 2;

  // Draw Background Box / Badge
  if (config.boxStyle !== 'none' && config.bgOpacity > 0) {
    const padX = config.bgPaddingX * scale;
    const padY = config.bgPaddingY * scale;
    const radius = Math.max(4, config.bgRadius * scale);
    const boxW = maxLineWidth + padX * 2;
    const boxH = totalTextHeight + padY * 2;
    const boxX = -boxW / 2;
    const boxY = -boxH / 2;

    ctx.save();
    ctx.globalAlpha = config.bgOpacity * animAlpha;

    if (config.boxStyle === 'full_bar') {
      ctx.fillStyle = config.bgColor || '#000000';
      ctx.fillRect(-width, boxY, width * 2, boxH);
    } else if (config.boxStyle === 'angled_badge') {
      // Modern skewed parallelogram badge (viral TikTok/Creator sticker)
      ctx.transform(1, 0, -0.09, 1, 0, 0);
      ctx.fillStyle = config.bgColor || '#FBBF24';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 8 * scale;
      ctx.shadowOffsetY = 4 * scale;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
        ctx.fill();
      } else {
        ctx.fillRect(boxX, boxY, boxW, boxH);
      }
    } else if (config.boxStyle === 'gradient_pill') {
      // Vibrant modern linear gradient pill
      const grad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
      grad.addColorStop(0, config.bgColor || '#7C3AED');
      grad.addColorStop(1, config.bgSecondaryColor || '#EC4899');
      ctx.fillStyle = grad;
      ctx.shadowColor = config.shadowColor || 'rgba(124,58,237,0.5)';
      ctx.shadowBlur = 12 * scale;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, 999);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
    } else if (config.boxStyle === 'glassmorphism') {
      // Frosted dark glass
      ctx.fillStyle = config.bgColor || '#020617';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
      ctx.lineWidth = 1.5 * scale;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.stroke();
    } else {
      // rounded_box or pill
      ctx.fillStyle = config.bgColor || '#000000';
      const actualRadius = config.boxStyle === 'pill' ? 999 : radius;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, actualRadius);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw Top Callout Emoji Sticker (if configured)
  if (config.calloutEmoji && config.calloutEmoji.trim()) {
    ctx.save();
    const emojiY = -totalTextHeight / 2 - (24 * scale);
    const emojiBounce = Math.sin(elapsedMs * 0.01) * 3 * scale;
    ctx.font = `${Math.round(26 * scale)}px "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6 * scale;
    ctx.fillText(config.calloutEmoji, 0, emojiY + emojiBounce);
    ctx.restore();
  }

  // Draw 3D Comic Extrusion Depth Layers (if configured)
  const depth = config.depth3D || 0;
  if (depth > 0) {
    const depthCol = config.depthColor || '#000000';
    const depthSteps = Math.max(1, Math.round(depth * scale));

    for (let d = depthSteps; d >= 1; d--) {
      const offX = d * 1.0;
      const offY = d * 1.2;

      lines.forEach((line, index) => {
        const lineY = startY + index * effectiveLineHeight + offY;

        // Draw 3D backing stroke & fill
        if (config.strokeWidth > 0) {
          ctx.strokeStyle = depthCol;
          ctx.lineWidth = config.strokeWidth * scale * 2;
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(line, offX, lineY);
        }
        ctx.fillStyle = depthCol;
        ctx.fillText(line, offX, lineY);
      });
    }
  }

  // Draw Main Text Lines
  lines.forEach((line, lineIndex) => {
    const lineY = startY + lineIndex * effectiveLineHeight;

    // Outer Shadow / Neon Glow
    if (pulseBlur > 0) {
      ctx.shadowColor = config.shadowColor || 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = pulseBlur * scale;
      ctx.shadowOffsetX = 2 * scale;
      ctx.shadowOffsetY = 2 * scale;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // Stroke / Outline
    if (config.strokeWidth > 0) {
      ctx.strokeStyle = config.strokeColor || '#000000';
      ctx.lineWidth = config.strokeWidth * scale * 2;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(line, 0, lineY);
    }

    // Fill Text: Check if Karaoke / Active Word Highlighting is enabled
    const isKaraokeActive = (config.animation === 'karaoke_active' || config.highlightWords) && line.trim().length > 0;

    if (isKaraokeActive) {
      // Split words for dynamic active highlight (handling both space-separated and Khmer continuous text)
      let words: string[] = [];
      if (line.includes(' ')) {
        words = line.split(/(\s+)/);
      } else {
        const rawChunks = line.split(/([។.!?,\s]+)/).filter(Boolean);
        const chunkList: string[] = [];
        for (const rc of rawChunks) {
          if (rc.length <= 10) {
            chunkList.push(rc);
          } else {
            for (let i = 0; i < rc.length; i += 8) {
              chunkList.push(rc.slice(i, i + 8));
            }
          }
        }
        words = chunkList.length > 0 ? chunkList : [line];
      }

      const pureWords = words.filter(w => w.trim().length > 0);
      const activeWordIndex = Math.min(pureWords.length - 1, Math.floor(progress * pureWords.length));
      
      const totalLineWidth = ctx.measureText(line).width;
      let startWordX = -totalLineWidth / 2;

      let wordCounter = 0;
      words.forEach(chunk => {
        const chunkWidth = ctx.measureText(chunk).width;
        const isSpace = chunk.trim().length === 0;

        if (!isSpace) {
          const isThisWordActive = wordCounter === activeWordIndex;
          ctx.save();
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          if (isThisWordActive) {
            if (config.preset === 'boxed_pill_highlight' || config.boxStyle === 'pill') {
              // Draw punchy yellow badge box behind the active word
              const pillPadX = 10 * scale;
              const pillPadY = 5 * scale;
              const pillW = chunkWidth + pillPadX * 2;
              const pillH = effectiveLineHeight + pillPadY;
              const pillX = startWordX - pillPadX;
              const pillY = lineY - pillH / 2;

              ctx.fillStyle = config.highlightColor || '#FFE600';
              ctx.shadowColor = 'rgba(0,0,0,0.5)';
              ctx.shadowBlur = 6 * scale;
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(pillX, pillY, pillW, pillH, 6 * scale);
              } else {
                ctx.fillRect(pillX, pillY, pillW, pillH);
              }
              ctx.fill();

              // Word inside pill box: bold dark text
              ctx.shadowColor = 'transparent';
              ctx.fillStyle = '#000000';
              ctx.fillText(chunk, startWordX, lineY);
            } else {
              ctx.fillStyle = config.highlightColor || '#FFE600';
              ctx.shadowColor = config.highlightColor || '#FFE600';
              ctx.shadowBlur = (config.shadowBlur || 12) * scale;
              ctx.fillText(chunk, startWordX, lineY);
            }
          } else {
            ctx.fillStyle = config.textColor || '#FFFFFF';
            ctx.fillText(chunk, startWordX, lineY);
          }

          ctx.restore();
          wordCounter++;
        } else {
          ctx.fillText(chunk, startWordX, lineY);
        }

        startWordX += chunkWidth;
      });
    } else {
      // Standard Solid Fill Text
      ctx.fillStyle = config.textColor || '#FFFFFF';
      ctx.fillText(line, 0, lineY);
    }
  });

  ctx.restore();
}
