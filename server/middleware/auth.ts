import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

/**
 * Middleware that extracts Firebase user token or falls back to IP-based guest session.
 * Does not block anonymous users; provides user context to routes.
 */
export function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      // Decode JWT payload without external library to extract standard Firebase claims (sub, email)
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);
        if (payload.user_id || payload.sub) {
          req.userId = payload.user_id || payload.sub;
          req.userEmail = payload.email;
        }
      }
    } catch {
      // Ignore token parse failures in optional auth
    }
  }

  // Fallback to client IP if no user ID was identified
  if (!req.userId) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || 'guest';
    req.userId = `guest_${ip.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  next();
}
