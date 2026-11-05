import { SubscriptionPlan, TokenTopupPack } from '../types';

export const TOOL_TOKEN_COSTS: Record<string, number> = {
  srt: 10,       // Subtitle Generator (base <=200 chars: 10 tokens, +10 per 200 chars)
  videostyle: 8, // Video Subtitle Styler
  ocr: 5,        // Image & Document OCR
  tts: 8,        // Khmer Voice Speech Synthesis (base <=200 chars: 8 tokens, +8 per 200 chars)
  qr: 1,         // Custom Styled QR Code
  download: 5,   // Social Video Downloader (TikTok, Douyin, FB, Pinterest, YouTube)
  idphoto: 10,   // Passport & ID Photo
  upscale: 8,    // AI Upscale & BG Remover
};

export interface TokenCostEstimate {
  tokens: number;
  chars: number;
  words: number;
  tierDescription: string;
  isOverBase: boolean;
}

/**
 * Calculates dynamic tokens for TTS generation based on character/word count.
 * Base: <= 200 characters = 8 tokens.
 * Above 200 characters: scaled by 8 tokens per 200 characters.
 */
export function calculateTtsTokens(text: string, isKhmer: boolean = true): TokenCostEstimate {
  const trimmed = text.trim();
  const chars = trimmed.length;
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;

  if (chars === 0) {
    return {
      tokens: 8,
      chars: 0,
      words: 0,
      tierDescription: isKhmer ? '≤ 200 តួអក្សរ (8 Tokens)' : '≤ 200 chars (8 Tokens)',
      isOverBase: false,
    };
  }

  const tokens = Math.max(8, Math.ceil(chars / 200) * 8);
  const tierMin = Math.floor((chars - 1) / 200) * 200 + 1;
  const tierMax = Math.ceil(chars / 200) * 200;
  const isOverBase = chars > 200;

  return {
    tokens,
    chars,
    words,
    tierDescription: isOverBase
      ? (isKhmer ? `${tierMin}-${tierMax} តួអក្សរ (${tokens} Tokens)` : `${tierMin}-${tierMax} chars (${tokens} Tokens)`)
      : (isKhmer ? '≤ 200 តួអក្សរ (8 Tokens)' : '≤ 200 chars (8 Tokens)'),
    isOverBase,
  };
}

/**
 * Calculates dynamic tokens for Subtitle (.SRT) generation based on script length.
 * Base: <= 200 characters = 10 tokens.
 * Above 200 characters: scaled by 10 tokens per 200 characters.
 */
export function calculateSrtTokens(script: string, isKhmer: boolean = true): TokenCostEstimate {
  const trimmed = script.trim();
  const chars = trimmed.length;
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;

  if (chars === 0) {
    return {
      tokens: 10,
      chars: 0,
      words: 0,
      tierDescription: isKhmer ? '≤ 200 តួអក្សរ (10 Tokens)' : '≤ 200 chars (10 Tokens)',
      isOverBase: false,
    };
  }

  const tokens = Math.max(10, Math.ceil(chars / 200) * 10);
  const tierMin = Math.floor((chars - 1) / 200) * 200 + 1;
  const tierMax = Math.ceil(chars / 200) * 200;
  const isOverBase = chars > 200;

  return {
    tokens,
    chars,
    words,
    tierDescription: isOverBase
      ? (isKhmer ? `${tierMin}-${tierMax} តួអក្សរ (${tokens} Tokens)` : `${tierMin}-${tierMax} chars (${tokens} Tokens)`)
      : (isKhmer ? '≤ 200 តួអក្សរ (10 Tokens)' : '≤ 200 chars (10 Tokens)'),
    isOverBase,
  };
}

export const DEFAULT_INITIAL_TOKENS = 100;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free Starter',
    nameKm: 'គម្រោងឥតគិតថ្លៃ (Free Starter)',
    badge: 'Standard',
    priceMonthlyUSD: 0,
    priceYearlyUSD: 0,
    priceMonthlyKHR: 0,
    tokensPerMonth: 100,
    descriptionKm: 'សាកល្បងឧបករណ៍ទាំងអស់ដោយឥតគិតថ្លៃជាមួយនឹង 100 Starter Tokens',
    descriptionEn: 'Try all tools for free with 100 starter tokens',
    features: [
      { textKm: '100 Token ផ្ដើមប្រើប្រាស់ដោយឥតគិតថ្លៃ', textEn: '100 Free Starter Tokens', included: true },
      { textKm: 'បង្កើត Subtitle .SRT ខ្មែរ-អង់គ្លេសស្វ័យប្រវត្ត', textEn: 'Auto Subtitle SRT Generator', included: true },
      { textKm: 'OCR អានអក្សរពីរូបថត និងឯកសារ PDF', textEn: 'Image & Document OCR text extraction', included: true },
      { textKm: 'សំឡេងអាន Khmer TTS ធម្មជាតិកម្រិតមូលដ្ឋាន', textEn: 'Basic Natural Khmer TTS Speech', included: true },
      { textKm: 'បង្កើត QR Code ស្អាតៗ និងឡូហ្គោ', textEn: 'Custom QR Code generator', included: true },
      { textKm: 'ល្បឿនដំណើរការធម្មតា (Standard Queue)', textEn: 'Standard processing speed', included: true },
      { textKm: 'នាំចេញវីដេអូកម្រិត 4K និងល្បឿន VIP', textEn: '4K Video Burn-in & VIP Speed Queue', included: false },
      { textKm: 'Voice Cloning សំឡេងផ្ទាល់ខ្លួនគ្មានដែនកំណត់', textEn: 'Unlimited Personal Voice Cloning', included: false },
    ],
  },
  {
    id: 'creator_pro',
    name: 'Creator Pro',
    nameKm: 'គម្រោងអ្នកបង្កើតមាតិកា (Creator Pro)',
    badge: 'ពេញនិយមបំផុត (Most Popular)',
    priceMonthlyUSD: 3.99,
    priceYearlyUSD: 3.19, // $38.28/yr (20% discount)
    priceMonthlyKHR: 16000,
    tokensPerMonth: 1500,
    descriptionKm: 'ល្អបំផុតសម្រាប់ Content Creator នៅ TikTok, Reels, YouTube និងអ្នកកាត់តវីដេអូ',
    descriptionEn: 'Best for content creators on TikTok, Reels, YouTube and editors',
    features: [
      { textKm: '1,500 Tokens ក្នុងមួយខែ (ប្រើបានរាប់រយវីដេអូ)', textEn: '1,500 Tokens / Month (Covers 150+ videos)', included: true },
      { textKm: 'ល្បឿនដំណើរការលឿនពិសេស (High Priority Queue)', textEn: 'High priority fast processing queue', included: true },
      { textKm: 'នាំចេញវីដេអូ Subtitle កម្រិត Full HD & 4K ច្បាស់ត្រជាក់ភ្នែក', textEn: 'Full HD & 4K Crystal Clear Video Export', included: true },
      { textKm: 'Style Subtitle បែប Viral (MrBeast, TikTok, Neon, 3D Tilt)', textEn: 'All 18+ Viral Subtitle Styles & Dynamic 3D tilt', included: true },
      { textKm: 'Khmer Voice Cloning ថត និងបម្លែងសំឡេងផ្ទាល់ខ្លួន', textEn: 'Khmer Voice Cloning from your voice samples', included: true },
      { textKm: 'OCR អានអក្សរខ្មែរលឿន និងបកប្រែពហុភាសាស្វ័យប្រវត្ត', textEn: 'Fast batch Khmer OCR with instant multi-translation', included: true },
      { textKm: 'សិទ្ធិប្រើប្រាស់សម្រាប់អាជីវកម្ម (Commercial License)', textEn: 'Full Commercial & Monetization License', included: true },
      { textKm: 'ជំនួយបច្ចេកទេសអាទិភាព (Priority Support)', textEn: 'Priority Community & Telegram Support', included: true },
    ],
  },
  {
    id: 'studio_ultra',
    name: 'Studio Ultra',
    nameKm: 'ស្ទូឌីយោអាជីវកម្ម (Studio Ultra)',
    badge: 'អតិបរមា (Max Power)',
    priceMonthlyUSD: 7.99,
    priceYearlyUSD: 6.39, // $76.68/yr (20% discount)
    priceMonthlyKHR: 32000,
    tokensPerMonth: 5000,
    descriptionKm: 'សម្រាប់ស្ទូឌីយោ ផលិតកម្ម ក្រុមហ៊ុនផ្សព្វផ្សាយ និងអ្នកផលិតមាតិកាអាជីព',
    descriptionEn: 'For studios, media agencies, publishers, and heavy power creators',
    features: [
      { textKm: '5,000 Tokens ក្នុងមួយខែ (ប្រើប្រាស់បានច្រើនបំផុត)', textEn: '5,000 Tokens / Month for high-volume creation', included: true },
      { textKm: 'អាទិភាពខ្ពស់បំផុតលើ Server (Max Priority Instant Queue)', textEn: 'Dedicated Server High Priority Instant Queue', included: true },
      { textKm: 'នាំចេញវីដេអូវែងៗ និងកម្រិត 4K 60FPS គ្មានដែនកំណត់', textEn: 'Unlimited Long Video & 4K 60FPS Processing', included: true },
      { textKm: 'Voice Cloning Profiles គ្មានដែនកំណត់ (Multiple Voices)', textEn: 'Unlimited Custom Khmer Voice Clone Profiles', included: true },
      { textKm: 'ដំណើរការឯកសារ OCR និង Subtitle ជាកញ្ចប់ធំ (Batch Mode)', textEn: 'Unlimited Bulk Batch OCR & Subtitle Processing', included: true },
      { textKm: 'រក្សាទុកទិន្នន័យលើ Cloud Storage បានយូរអង្វែង', textEn: 'Long-term secure cloud storage for your assets', included: true },
      { textKm: 'សិទ្ធិផ្តាច់មុខប្រើប្រាស់ម៉ូដែល AI ជំនាន់ថ្មីៗមុនគេ', textEn: 'Early access to next-gen AI experimental models', included: true },
      { textKm: 'ជំនួយបច្ចេកទេសផ្ទាល់ខ្លួន 24/7 (Dedicated Support)', textEn: '24/7 Dedicated Account & Tech Manager Support', included: true },
    ],
  },
];

export const TOKEN_TOPUP_PACKS: TokenTopupPack[] = [
  {
    id: 'pack_500',
    tokens: 500,
    priceUSD: 3.99,
    priceKHR: 16000,
    badge: 'Starter',
    bonus: '+50 Bonus',
  },
  {
    id: 'pack_1200',
    tokens: 1200,
    priceUSD: 7.99,
    priceKHR: 32000,
    badge: 'ពេញនិយម (Popular)',
    bonus: '+200 Bonus',
  },
  {
    id: 'pack_3000',
    tokens: 3000,
    priceUSD: 16.99,
    priceKHR: 68000,
    badge: 'តម្លៃល្អបំផុត (Best Value)',
    bonus: '+600 Bonus',
  },
];
