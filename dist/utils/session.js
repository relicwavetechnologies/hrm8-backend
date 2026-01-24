"use strict";
/**
 * Session Utilities
 * Helper functions for session management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSessionId = generateSessionId;
exports.getSessionExpiration = getSessionExpiration;
exports.isSessionExpired = isSessionExpired;
exports.getSessionCookieOptions = getSessionCookieOptions;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a secure random session ID
 * @returns Random session ID string
 */
function generateSessionId() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
/**
 * Calculate session expiration time
 * @param hours - Number of hours until expiration (default: 24)
 * @returns Expiration date
 */
function getSessionExpiration(hours = 24) {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hours);
    return expiration;
}
/**
 * Check if session is expired
 * @param expiresAt - Session expiration date
 * @returns true if session is expired
 */
function isSessionExpired(expiresAt) {
    return new Date() > expiresAt;
}
/**
 * Get cookie options for session cookies
 * For cross-site requests (different domains), uses 'none' with secure flag
 * This is required when frontend and backend are on different domains
 */
function getSessionCookieOptions(maxAge) {
    const isProduction = process.env.NODE_ENV === 'production';
    // Determine sameSite setting:
    // - If explicitly set via env var, use that
    // - In production, default to 'none' for cross-site compatibility (common in cloud deployments)
    // - In development, use 'lax' for localhost compatibility
    let sameSite = 'lax';
    if (process.env.COOKIE_SAME_SITE) {
        const envValue = process.env.COOKIE_SAME_SITE.toLowerCase();
        if (envValue === 'none' || envValue === 'strict' || envValue === 'lax') {
            sameSite = envValue;
        }
    }
    else if (isProduction) {
        // Default to 'none' in production for cross-site compatibility
        // This is required when frontend and backend are on different domains
        sameSite = 'none';
    }
    return {
        httpOnly: true, // Prevent XSS attacks
        secure: isProduction, // HTTPS only in production (required for sameSite: 'none')
        sameSite: sameSite,
        maxAge: maxAge || 24 * 60 * 60 * 1000, // 24 hours default
        path: '/', // Available on all routes
        // Don't set domain - let browser handle it based on the request origin
    };
}
