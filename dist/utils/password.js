"use strict";
/**
 * Password Hashing Utilities
 * Using bcrypt for secure password hashing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.isPasswordStrong = isPasswordStrong;
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 12;
/**
 * Hash a password
 * @param password - Plain text password
 * @returns Hashed password
 */
async function hashPassword(password) {
    return await bcrypt_1.default.hash(password, SALT_ROUNDS);
}
/**
 * Compare password with hash
 * @param password - Plain text password
 * @param hash - Hashed password from database
 * @returns true if passwords match
 */
async function comparePassword(password, hash) {
    return await bcrypt_1.default.compare(password, hash);
}
/**
 * Verify password strength
 * @param password - Password to verify
 * @returns true if password meets requirements
 */
function isPasswordStrong(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return (password.length >= minLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumber);
}
