"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = exports.DATABASE_URL = exports.NODE_ENV = exports.PORT = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const getEnv = (key, defaultValue) => {
    const value = process.env[key] ?? defaultValue;
    if (value === undefined) {
        throw new Error(`Environment variable ${key} is not set`);
    }
    return value;
};
exports.PORT = parseInt(getEnv('PORT', '4000'), 10);
exports.NODE_ENV = getEnv('NODE_ENV', 'development');
exports.DATABASE_URL = getEnv('DATABASE_URL', '');
exports.JWT_SECRET = getEnv('JWT_SECRET', 'changeme');
