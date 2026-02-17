"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.CLOUDINARY_API_SECRET = exports.CLOUDINARY_API_KEY = exports.CLOUDINARY_CLOUD_NAME = exports.SMTP_FROM = exports.SMTP_SECURE = exports.SMTP_PASS = exports.SMTP_USER = exports.SMTP_PORT = exports.SMTP_HOST = exports.SESSION_SECRET = exports.JWT_SECRET = exports.DATABASE_URL = exports.NODE_ENV = exports.PORT = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const getEnv = (key, defaultValue) => {
    const value = process.env[key] ?? defaultValue;
    if (value === undefined) {
        throw new Error(`Environment variable ${key} is not set`);
    }
    return value;
};
exports.PORT = parseInt(getEnv('PORT', '3000'), 10);
exports.NODE_ENV = getEnv('NODE_ENV', 'development');
exports.DATABASE_URL = getEnv('DATABASE_URL', '');
exports.JWT_SECRET = getEnv('JWT_SECRET', 'changeme');
exports.SESSION_SECRET = getEnv('SESSION_SECRET', 'your-secret-key-change-in-production');
// SMTP Config
exports.SMTP_HOST = getEnv('SMTP_HOST', '');
exports.SMTP_PORT = getEnv('SMTP_PORT', '587');
exports.SMTP_USER = getEnv('SMTP_USER', '');
exports.SMTP_PASS = getEnv('SMTP_PASS', '');
exports.SMTP_SECURE = getEnv('SMTP_SECURE', 'false');
exports.SMTP_FROM = getEnv('SMTP_FROM', '');
// Cloudinary
exports.CLOUDINARY_CLOUD_NAME = getEnv('CLOUDINARY_CLOUD_NAME', '');
exports.CLOUDINARY_API_KEY = getEnv('CLOUDINARY_API_KEY', '');
exports.CLOUDINARY_API_SECRET = getEnv('CLOUDINARY_API_SECRET', '');
// Default export object for convenient access
exports.env = {
    PORT: exports.PORT,
    NODE_ENV: exports.NODE_ENV,
    DATABASE_URL: exports.DATABASE_URL,
    JWT_SECRET: exports.JWT_SECRET,
    SESSION_SECRET: exports.SESSION_SECRET,
    SMTP_HOST: exports.SMTP_HOST,
    SMTP_PORT: exports.SMTP_PORT,
    SMTP_USER: exports.SMTP_USER,
    SMTP_PASS: exports.SMTP_PASS,
    SMTP_SECURE: exports.SMTP_SECURE,
    SMTP_FROM: exports.SMTP_FROM,
    CLOUDINARY_CLOUD_NAME: exports.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: exports.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: exports.CLOUDINARY_API_SECRET,
    FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:5173'),
    ATS_FRONTEND_URL: getEnv('ATS_FRONTEND_URL', 'http://localhost:8080')
};
