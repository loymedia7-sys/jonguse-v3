import { VideoInfo, QualityOption } from './types';

const DOUYIN_API_URL = process.env.DOUYIN_API_URL || '';

export interface DouyinScraperResponse {
  title?: string;
  desc?: string;
  cover?: string;
  author?: {
    nickname?: string;
  };
  video?: {
    play_addr?: {
      url_list?: string[];
    };
    duration?: number;
    width?: number;
    height?: number;
  };
  music?: {
    play_url?: {
      url_list?: string[];
    };
  };
}

/**
 * Maps arbitrary external Douyin scraper response into normalized VideoInfo.
 */
export function mapDouyinResponse(raw: any, sourceUrl: string): VideoInfo {
  const title = raw.title || raw.desc || 'Douyin Video';
  const thumbnail = raw.cover || raw.thumbnail || raw.video?.cover?.url_list?.[0];
  const duration = raw.video?.duration ? Math.round(raw.video.duration / 1000) : undefined;
  const author = raw.author?.nickname || raw.nickname || 'Douyin Creator';

  const qualities: QualityOption[] = [];

  const videoUrl = raw.video?.play_addr?.url_list?.[0] || raw.url || raw.video_url;
  if (videoUrl) {
    qualities.push({
      id: 'video_best',
      label: 'HD No Watermark (MP4)',
      resolution: raw.video?.height ? `${raw.video.width || '?'}x${raw.video.height}` : 'HD',
      height: raw.video?.height || 1080,
      width: raw.video?.width,
      isAudioOnly: false,
      ext: 'mp4',
    });
  }

  const audioUrl = raw.music?.play_url?.url_list?.[0] || raw.audio_url;
  if (audioUrl) {
    qualities.push({
      id: 'audio_mp3',
      label: 'Audio Only (MP3)',
      isAudioOnly: true,
      ext: 'mp3',
    });
  }

  return {
    url: sourceUrl,
    platform: 'douyin',
    title,
    thumbnail,
    duration,
    author,
    qualities: qualities.length > 0 ? qualities : [
      { id: 'video_best', label: 'Best Available (MP4)', isAudioOnly: false, ext: 'mp4' },
      { id: 'audio_mp3', label: 'Audio Only (MP3)', isAudioOnly: true, ext: 'mp3' },
    ],
  };
}

/**
 * Resolves short redirect URLs (like https://v.douyin.com/xxxx/)
 */
export async function resolveRedirectUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      },
    });
    return res.url || url;
  } catch {
    return url;
  }
}

/**
 * Optional scraper fallback if DOUYIN_API_URL is configured.
 */
export async function fetchDouyinFromCustomApi(url: string): Promise<VideoInfo | null> {
  if (!DOUYIN_API_URL) return null;

  try {
    const resolved = await resolveRedirectUrl(url);
    const apiUrl = new URL(DOUYIN_API_URL);
    apiUrl.searchParams.set('url', resolved);

    const resp = await fetch(apiUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    return mapDouyinResponse(data, url);
  } catch (err) {
    console.warn('Custom Douyin scraper API failed:', err);
    return null;
  }
}
