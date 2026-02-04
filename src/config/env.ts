import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};

export const PORT = parseInt(getEnv('PORT', '3000'), 10);
export const NODE_ENV = getEnv('NODE_ENV', 'development');
export const DATABASE_URL = getEnv('DATABASE_URL', '');
export const JWT_SECRET = getEnv('JWT_SECRET', 'changeme');
export const SESSION_SECRET = getEnv('SESSION_SECRET', 'your-secret-key-change-in-production');

// SMTP Config
export const SMTP_HOST = getEnv('SMTP_HOST', '');
export const SMTP_PORT = getEnv('SMTP_PORT', '587');
export const SMTP_USER = getEnv('SMTP_USER', '');
export const SMTP_PASS = getEnv('SMTP_PASS', '');
export const SMTP_SECURE = getEnv('SMTP_SECURE', 'false');
export const SMTP_FROM = getEnv('SMTP_FROM', '');

// Cloudinary
export const CLOUDINARY_CLOUD_NAME = getEnv('CLOUDINARY_CLOUD_NAME', '');
export const CLOUDINARY_API_KEY = getEnv('CLOUDINARY_API_KEY', '');
export const CLOUDINARY_API_SECRET = getEnv('CLOUDINARY_API_SECRET', '');

// Default export object for convenient access
export const env = {
  PORT,
  NODE_ENV,
  DATABASE_URL,
  JWT_SECRET,
  SESSION_SECRET,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  SMTP_FROM,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:5173')
};

