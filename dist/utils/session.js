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
exports.generateToken = generateToken;
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
 * Generate a secure random token
 */
function generateToken() {
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
    // - Default to 'lax' which works for localhost development (ports don't affect SameSite)
    // - sameSite: 'none' requires Secure: true, which is fine on localhost but strict in browsers
    let sameSite = 'lax';
    let secure = false;
    if (process.env.COOKIE_SAME_SITE) {
        const envValue = process.env.COOKIE_SAME_SITE.toLowerCase();
        if (envValue === 'none' || envValue === 'strict' || envValue === 'lax') {
            sameSite = envValue;
        }
    }
    // In production, or if SameSite=None, we MUST use Secure
    if (isProduction || sameSite === 'none') {
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
