import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  messageKm?: string;
}) {
  const hits = new Map<string, RateLimitRecord>();

  // Periodic cleanup
  setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of hits.entries()) {
      if (now > rec.resetAt) {
        hits.delete(key);
      }
    }
  }, 60000).unref();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const key = req.userId || req.ip || 'anonymous';
    const now = Date.now();

    const record = hits.get(key);
    if (!record || now > record.resetAt) {
      hits.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return next();
    }

    if (record.count >= options.maxRequests) {
      return res.status(429).json({
        error: options.message || 'Too many requests. Please slow down and try again shortly.',
        errorKm: options.messageKm || 'អ្នកបានស្នើសុំច្រើនដងពេក។ សូមរង់ចាំមួយភ្លែត រួចសាកល្បងម្ដងទៀត។',
        retryAfterMs: Math.max(0, record.resetAt - now),
      });
    }

    record.count++;
    next();
  };
}

export const infoRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Too many video info requests. Please wait a minute.',
  messageKm: 'បានត្រួតពិនិត្យ link ច្រើនដងពេក។ សូមរង់ចាំ ១ នាទី។',
});

export const startDownloadRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
  message: 'Download rate limit reached. Please wait a few minutes before starting more downloads.',
  messageKm: 'បានទាញយកច្រើនដងពេកក្នុងពេលដំណាលគ្នា។ សូមរង់ចាំប៉ុន្មាននាទី។',
});
