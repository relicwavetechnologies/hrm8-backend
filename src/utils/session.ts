/**
 * Session Utilities
 * Helper functions for session management
 */

import crypto from 'crypto';

/**
 * Generate a secure random session ID
 * @returns Random session ID string
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate session expiration time
 * @param hours - Number of hours until expiration (default: 24)
 * @returns Expiration date
 */
export function getSessionExpiration(hours: number = 24): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + hours);
  return expiration;
}

/**
 * Check if session is expired
 * @param expiresAt - Session expiration date
 * @returns true if session is expired
 */
export function isSessionExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Get cookie options for session cookies
 * For cross-site requests (different domains), uses 'none' with secure flag
 * This is required when frontend and backend are on different domains
 */
export function getSessionCookieOptions(maxAge?: number) {
  const isProduction = process.env.NODE_ENV === 'production';

  // For localhost development (different ports), 'lax' works because they're same-site
  // In production with different domains, use 'none' with secure flag
  let sameSite: 'lax' | 'strict' | 'none' = isProduction ? 'none' : 'lax';
  let secure = isProduction; // Only require HTTPS in production

  // Allow override via environment variable
  if (process.env.COOKIE_SAME_SITE) {
    const envValue = process.env.COOKIE_SAME_SITE.toLowerCase();
    if (envValue === 'none' || envValue === 'strict' || envValue === 'lax') {
      sameSite = envValue as 'lax' | 'strict' | 'none';
    }
  }

  // If sameSite is 'none', secure MUST be true (browser requirement)
  if (sameSite === 'none') {
    secure = true;
  }

  return {
    httpOnly: true, // Prevent XSS attacks
    secure: secure, // HTTPS only in production
    sameSite: sameSite, // 'lax' allows localhost:8080 → localhost:3000
    maxAge: maxAge || 7 * 24 * 60 * 60 * 1000, // 7 days default
    path: '/', // Available on all routes
    // Don't set domain - let browser handle it based on the request origin
  };
}