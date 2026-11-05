import { SubtitleItem, SubtitleWord } from '../templates/presets';

/**
 * Splits text into Khmer words using Intl.Segmenter with 'km' locale.
 * Fallbacks safely if Intl.Segmenter is unavailable.
 */
export function segmentKhmerWords(text: string): string[] {
  if (!text || !text.trim()) return [];

  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter('km', { granularity: 'word' });
      const segments = Array.from(segmenter.segment(text)) as Array<{ segment: string; isWordLike?: boolean }>;
      const words: string[] = [];
      let buffer = '';

      for (const seg of segments) {
        if (seg.isWordLike) {
          if (buffer.trim()) {
            words.push(buffer);
            buffer = '';
          }
          words.push(seg.segment);
        } else {
          // Spaces or punctuation attached to previous or collected
          buffer += seg.segment;
        }
      }
      if (buffer.trim()) {
        words.push(buffer);
      }
      return words.filter((w) => w.trim().length > 0);
    } catch (e) {
      console.warn('Intl.Segmenter km error, falling back:', e);
    }
  }

  // Fallback: split on spaces or punctuation
  if (text.includes(' ')) {
    return text.split(/\s+/).filter(Boolean);
  }

  // Fallback for contiguous Khmer: chunk every 8-12 characters
  const parts = text.split(/([។.!?,\s]+)/).filter(Boolean);
  const result: string[] = [];
  for (const part of parts) {
    if (part.length <= 12) {
      result.push(part);
    } else {
      for (let i = 0; i < part.length; i += 10) {
        result.push(part.slice(i, i + 10));
      }
    }
  }
  return result.filter(Boolean);
}

/**
 * Normalizes Khmer punctuation and cleans spacing.
 */
export function cleanKhmerText(text: string): string {
  if (!text) return '';
  let cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\.{3,}/g, '…')
    .replace(/([?!]+)/g, ' $1 ')
    .replace(/\s+([។,])/g, '$1')
    .trim();

  return cleaned;
}

/**
 * Splits a long text line into 1 or 2 lines of max maxChars (default 42),
 * breaking only at word boundaries identified by segmentKhmerWords.
 */
export function formatKhmerLines(text: string, maxCharsPerLine = 42): string {
  const words = segmentKhmerWords(text);
  if (words.length <= 1) return text;

  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    // If adding this word exceeds maxCharsPerLine, break line
    if ((currentLine + word).length > maxCharsPerLine && currentLine.length > 0) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine.length > 0 && !currentLine.endsWith(' ') ? ' ' : '') + word;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.slice(0, 2).join('\n');
}

export interface AutoEditOptions {
  maxCharsPerLine?: number; // default 42
  maxLines?: number;         // default 2
  mergeShortDurationSec?: number; // default 0.6s
  splitLongDurationSec?: number;  // default 5.0s
}

/**
 * Auto-clean + split into subtitle lines:
 * 1. Clean spelling and punctuation
 * 2. Split long lines (max 2 lines, 42 characters)
 * 3. Merge very short fragments (< 0.6s)
 * 4. Recalculate word timestamps and sequence IDs
 */
export function autoEditSubtitles(
  subtitles: SubtitleItem[],
  options: AutoEditOptions = {}
): SubtitleItem[] {
  if (!subtitles || subtitles.length === 0) return [];

  const maxChars = options.maxCharsPerLine || 42;
  const maxTotalChars = maxChars * (options.maxLines || 2);
  const minDur = options.mergeShortDurationSec || 0.6;

  // Step 1: Clean texts and normalize
  const cleaned: SubtitleItem[] = subtitles.map((sub, idx) => {
    const rawText = cleanKhmerText(sub.text);
    return {
      ...sub,
      id: idx + 1,
      text: rawText,
    };
  }).filter((s) => s.text.length > 0);

  // Step 2: Merge adjacent very short items
  const merged: SubtitleItem[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const current = cleaned[i];
    const dur = current.end - current.start;

    // Check if can merge with next
    if (dur < minDur && i + 1 < cleaned.length) {
      const next = cleaned[i + 1];
      const combinedLen = current.text.length + next.text.length;
      if (combinedLen <= maxTotalChars && next.start - current.end < 0.8) {
        // Merge
        const combinedText = `${current.text} ${next.text}`.trim();
        const combinedWords = [
          ...(current.words || []),
          ...(next.words || []),
        ];
        merged.push({
          id: merged.length + 1,
          start: current.start,
          end: next.end,
          text: combinedText,
          words: combinedWords.length > 0 ? combinedWords : undefined,
        });
        i++; // skip next since merged
        continue;
      }
    }
    merged.push({
      ...current,
      id: merged.length + 1,
    });
  }

  // Step 3: Split items that are still too long (exceeding maxTotalChars or maxChars)
  const result: SubtitleItem[] = [];

  for (const item of merged) {
    const dur = Math.max(0.4, item.end - item.start);

    if (item.text.length > maxTotalChars) {
      // Split into 2 chunks
      const words = segmentKhmerWords(item.text);
      if (words.length >= 2) {
        const half = Math.ceil(words.length / 2);
        const chunk1Words = words.slice(0, half);
        const chunk2Words = words.slice(half);

        const text1 = formatKhmerLines(chunk1Words.join(' '), maxChars);
        const text2 = formatKhmerLines(chunk2Words.join(' '), maxChars);

        const splitTime = Number((item.start + dur * (text1.length / item.text.length)).toFixed(2));

        result.push({
          id: result.length + 1,
          start: item.start,
          end: splitTime,
          text: text1,
        });

        result.push({
          id: result.length + 1,
          start: splitTime,
          end: item.end,
          text: text2,
        });
        continue;
      }
    }

    // Format into at most 2 lines with proper wrapping
    result.push({
      ...item,
      id: result.length + 1,
      text: formatKhmerLines(item.text, maxChars),
    });
  }

  return result;
}

/**
 * Splits existing subtitle items into punchy 1, 2, or 3 word chunks (for TikTok, Reels, Shorts pop animation)
 */
export function splitSubtitlesToWordChunks(
  subtitles: SubtitleItem[],
  wordsPerChunk: 1 | 2 | 3 = 1
): SubtitleItem[] {
  if (!subtitles || subtitles.length === 0) return [];

  const chunks: SubtitleItem[] = [];
  let nextId = 1;

  for (const item of subtitles) {
    const dur = Math.max(0.3, item.end - item.start);

    // If word-level timestamps already exist, use them
    if (item.words && item.words.length > 0) {
      const words = item.words.filter((w) => w.w.trim().length > 0);
      for (let i = 0; i < words.length; i += wordsPerChunk) {
        const group = words.slice(i, i + wordsPerChunk);
        const groupText = group.map((g) => g.w).join(' ');
        const groupStart = Number(group[0].s.toFixed(2));
        const groupEnd = Number(group[group.length - 1].e.toFixed(2));

        chunks.push({
          id: nextId++,
          start: groupStart,
          end: Math.max(groupStart + 0.25, groupEnd),
          text: groupText,
          words: group,
        });
      }
      continue;
    }

    // Segment text into Khmer words
    const words = segmentKhmerWords(item.text);
    if (words.length <= wordsPerChunk) {
      chunks.push({
        id: nextId++,
        start: item.start,
        end: item.end,
        text: item.text,
      });
      continue;
    }

    // Group words into chunks of 1, 2, or 3
    const groups: string[] = [];
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      groups.push(words.slice(i, i + wordsPerChunk).join(' '));
    }

    const totalChars = groups.reduce((acc, g) => acc + g.length, 0);
    let curStart = item.start;

    groups.forEach((g, idx) => {
      const isLast = idx === groups.length - 1;
      const groupDur = isLast
        ? Math.max(0.25, item.end - curStart)
        : Math.max(0.25, Number((dur * (g.length / Math.max(1, totalChars))).toFixed(2)));

      const groupEnd = isLast ? item.end : Number((curStart + groupDur).toFixed(2));

      chunks.push({
        id: nextId++,
        start: Number(curStart.toFixed(2)),
        end: Number(groupEnd.toFixed(2)),
        text: g,
      });

      curStart = groupEnd;
    });
  }

  return chunks;
}
