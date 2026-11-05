export type Language = 'km' | 'en';

export type ToolType = 'ocr' | 'qr' | 'tts' | 'srt' | 'videostyle' | 'download';

export interface OcrResult {
  detectedLanguage: string;
  extractedText: string;
  translatedText?: string;
  confidence?: string;
  summary?: string;
}

export interface QrCodeConfig {
  type: 'text' | 'url' | 'wifi' | 'khqr' | 'contact';
  content: string;
  wifiSsid?: string;
  wifiPassword?: string;
  wifiEncryption?: 'WPA' | 'WEP' | 'nopass';
  fgColor: string;
  bgColor: string;
  dotType: 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
  cornerSquareType: 'dot' | 'square' | 'extra-rounded';
  logoUrl?: string;
  title?: string;
}

export type VoiceCloneMethod = 'zero_shot' | 'zero_shot_transcript' | 'lora_finetune' | 'full_finetune';

export interface ClonedVoiceProfile {
  id: string;
  name: string;
  nameKm?: string;
  engine?: 'VoxCPM2' | 'Gemini';
  cloneMethod?: VoiceCloneMethod;
  referenceAudioBase64?: string;
  referenceTranscript?: string;
  audioDurationSec?: number;
  gender: 'Male' | 'Female' | 'Neutral';
  pitch: 'Deep' | 'Medium' | 'High';
  pitchShiftSemitones?: number;
  timbre: string;
  pace: 'Slow' | 'Moderate' | 'Fast';
  speedMultiplier?: number;
  bestBaseVoice: string; // 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Aoede' | 'Charon'
  prosodyInstructions: string;
  transcription?: string;
  sampleAudioUrl?: string;
  createdAt: number;
  isPreset?: boolean;
}

export interface TtsJob {
  text: string;
  lang: string;
  voice: string;
  cloneProfile?: ClonedVoiceProfile;
  audioUrl?: string;
  audioBase64?: string;
}

export interface SubtitleSegment {
  id: number;
  startTime: string; // "00:00:01,200"
  endTime: string;   // "00:00:04,500"
  startMs: number;
  endMs: number;
  text: string;
}

export type SubtitlePreset = 
  | 'bold_pop_viral'
  | 'karaoke_gold_sweep'
  | 'cyber_neon_glow'
  | 'boxed_pill_highlight'
  | 'minimal_modern'
  | 'flame_amber_pop'
  | 'tiktok_yellow' 
  | 'hormozi_green'
  | 'mrbeast_pop'
  | 'gradient_sticker'
  | 'rotated_badge'
  | 'cinematic_white' 
  | 'boxed_dark' 
  | 'koulen_gold' 
  | 'neon_cyan' 
  | 'karaoke_pink'
  | 'battambang_bold'
  | 'minimal_clean';

export type SubtitleAnimation = 
  | 'none' 
  | 'pop' 
  | 'rotate_pop' 
  | 'bounce' 
  | 'wobble' 
  | 'glow_pulse' 
  | 'karaoke_active' 
  | 'fade_slide';

export type SubtitleBoxStyle = 
  | 'none' 
  | 'rounded_box' 
  | 'pill' 
  | 'full_bar' 
  | 'angled_badge' 
  | 'gradient_pill' 
  | 'glassmorphism';

export interface SubtitleStyleConfig {
  preset: SubtitlePreset | 'custom';
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  textColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  depth3D: number; // 0 to 12 px 3D extrusion
  depthColor?: string;
  rotationAngle: number; // in degrees, e.g. -15 to +15
  dynamicTilt: boolean; // Alternates -3° / +3° on consecutive segments
  bgColor: string;
  bgSecondaryColor?: string;
  bgOpacity: number;
  bgPaddingX: number;
  bgPaddingY: number;
  bgRadius: number;
  boxStyle: SubtitleBoxStyle;
  positionY: number; // 0 to 100 percentage from top
  textAlign: 'center' | 'left' | 'right';
  letterSpacing: number;
  lineHeight: number;
  textTransform: 'none' | 'uppercase';
  animation: SubtitleAnimation;
  highlightWords?: boolean;
  highlightColor?: string;
  calloutEmoji?: string;
}

export interface UsageLogItem {
  id: string;
  tool: ToolType;
  title: string;
  timestamp: number;
  previewUrl?: string;
  summary?: string;
  tokensDeducted?: number;
  tokensRemaining?: number;
  userEmail?: string;
}

export type SubscriptionPlanId = 'free' | 'creator_pro' | 'studio_ultra';

export interface PlanFeature {
  textKm: string;
  textEn: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  nameKm: string;
  badge?: string;
  priceMonthlyUSD: number;
  priceYearlyUSD: number; // billed annually
  priceMonthlyKHR: number;
  tokensPerMonth: number;
  descriptionKm: string;
  descriptionEn: string;
  features: PlanFeature[];
}

export interface UserAccountData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAnonymous: boolean;
  plan: SubscriptionPlanId;
  tokens: number;
  totalTokensUsed: number;
  operationsCount: number;
  planBillingCycle?: 'monthly' | 'yearly';
  planExpiresAt?: number;
  createdAt?: number;
  lastActiveAt?: number;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  userEmail: string;
  tool: string;
  title: string;
  tokensDeducted: number;
  tokensRemaining: number;
  timestamp: number;
  summary?: string;
  status: 'success' | 'failed';
}

export interface TokenTopupPack {
  id: string;
  tokens: number;
  priceUSD: number;
  priceKHR: number;
  badge?: string;
  bonus?: string;
}
