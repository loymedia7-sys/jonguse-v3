import { SupportedPlatform } from './types';

// Disallowed private IPv4 ranges, localhost, and special addresses
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^[fF][cCdD][0-9a-fA-F]{2}:/,
  /^[fF][eE][89aAbB][0-9a-fA-F]:/,
];

export interface PlatformValidationResult {
  isValid: boolean;
  platform?: SupportedPlatform;
  cleanUrl?: string;
  error?: string;
  errorKm?: string;
}

/**
 * Checks if a hostname or IP is private or loopback (anti-SSRF guard).
 */
export function isPrivateOrLocalHost(hostname: string): boolean {
  const clean = hostname.trim().toLowerCase();
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(clean)) return true;
  }
  return false;
}

/**
 * Identifies the platform from the URL hostname and validates allowed hosts.
 * Strictly allows only: TikTok, Douyin, Facebook, Pinterest, YouTube.
 */
export function detectPlatform(urlStr: string): PlatformValidationResult {
  if (!urlStr || typeof urlStr !== 'string') {
    return {
      isValid: false,
      error: 'Please provide a valid video link.',
      errorKm: 'សូមផ្ដល់ Link វីដេអូដែលត្រឹមត្រូវ។',
    };
  }

  let parsed: URL;
  try {
    const raw = urlStr.trim();
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    parsed = new URL(withProtocol);
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format.',
      errorKm: 'ទម្រង់ Link មិនត្រឹមត្រូវទេ។',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      error: 'Only HTTP and HTTPS links are allowed.',
      errorKm: 'អនុញ្ញាតតែតំណភ្ជាប់ HTTP និង HTTPS ប៉ុណ្ណោះ។',
    };
  }

  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      error: 'URLs with embedded credentials are not allowed.',
      errorKm: 'មិនអនុញ្ញាតឱ្យប្រើប្រាស់ Link ដែលមាន Username ឬ Password ឡើយ។',
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // SSRF guard
  if (isPrivateOrLocalHost(hostname)) {
    return {
      isValid: false,
      error: 'Access to local or private network addresses is restricted.',
      errorKm: 'មិនអនុញ្ញាតឱ្យចូលប្រើអាសយដ្ឋានបណ្តាញខាងក្នុងឡើយ។',
    };
  }

  // 1. TikTok
  if (
    hostname === 'tiktok.com' ||
    hostname.endsWith('.tiktok.com') ||
    hostname === 'vm.tiktok.com' ||
    hostname === 'vt.tiktok.com'
  ) {
    return {
      isValid: true,
      platform: 'tiktok',
      cleanUrl: parsed.toString(),
    };
  }

  // 2. Douyin
  if (
    hostname === 'douyin.com' ||
    hostname.endsWith('.douyin.com') ||
    hostname === 'iesdouyin.com' ||
    hostname.endsWith('.iesdouyin.com') ||
    hostname === 'v.douyin.com'
  ) {
    return {
      isValid: true,
      platform: 'douyin',
      cleanUrl: parsed.toString(),
    };
  }

  // 3. Facebook
  if (
    hostname === 'facebook.com' ||
    hostname.endsWith('.facebook.com') ||
    hostname === 'fb.watch' ||
    hostname === 'fb.com' ||
    hostname.endsWith('.fb.com')
  ) {
    return {
      isValid: true,
      platform: 'facebook',
      cleanUrl: parsed.toString(),
    };
  }

  // 4. Pinterest
  if (
    hostname === 'pinterest.com' ||
    hostname.endsWith('.pinterest.com') ||
    hostname === 'pin.it'
  ) {
    return {
      isValid: true,
      platform: 'pinterest',
      cleanUrl: parsed.toString(),
    };
  }

  // 5. YouTube
  if (
    hostname === 'youtube.com' ||
    hostname.endsWith('.youtube.com') ||
    hostname === 'youtu.be'
  ) {
    return {
      isValid: true,
      platform: 'youtube',
      cleanUrl: parsed.toString(),
    };
  }

  return {
    isValid: false,
    error: 'Only TikTok, Douyin, Facebook, Pinterest, and YouTube links are supported.',
    errorKm: 'គាំទ្រតែ Link ពី TikTok, Douyin, Facebook, Pinterest និង YouTube ប៉ុណ្ណោះ។',
  };
}
