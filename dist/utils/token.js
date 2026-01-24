"use strict";
/**
 * Token Generation Utilities
 * Used for invitation tokens, verification tokens, etc.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.generateInvitationToken = generateInvitationToken;
exports.generateVerificationToken = generateVerificationToken;
exports.hashToken = hashToken;
exports.compareToken = compareToken;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a secure random token
 * @param length - Length of the token (default: 32)
 * @returns Random token string
 */
function generateToken(length = 32) {
    return crypto_1.default.randomBytes(length).toString('hex');
}
/**
 * Generate an invitation token
 * @returns Invitation token
 */
function generateInvitationToken() {
    return generateToken(32);
}
/**
 * Generate a verification token
 * @returns Verification token
 */
function generateVerificationToken() {
    return generateToken(32);
}
/**
 * Hash a token (for storage in database)
 * @param token - Token to hash
 * @returns Hashed token
 */
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
/**
 * Compare a token with a hashed token
 * @param token - Plain token
 * @param hashedToken - Hashed token from database
 * @returns true if tokens match
 */
function compareToken(token, hashedToken) {
    const hashed = hashToken(token);
    return hashed === hashedToken;
}
