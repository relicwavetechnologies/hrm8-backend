"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvitationToken = generateInvitationToken;
exports.verifyInvitationToken = verifyInvitationToken;
const crypto_1 = __importDefault(require("crypto"));
const SECRET = process.env.SESSION_SECRET || 'invitation-secret-fallback-change-me';
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
function generateInvitationToken(consultantId) {
    const timestamp = Date.now().toString();
    const payload = Buffer.from(JSON.stringify({ consultantId, timestamp })).toString('base64');
    const signature = crypto_1.default
        .createHmac('sha256', SECRET)
        .update(payload)
        .digest('hex');
    return `${payload}.${signature}`;
}
function verifyInvitationToken(token) {
    try {
        const [payload, signature] = token.split('.');
        if (!payload || !signature)
            return null;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', SECRET)
            .update(payload)
            .digest('hex');
        if (signature !== expectedSignature)
            return null;
        const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
        const { consultantId, timestamp } = data;
        if (!consultantId || !timestamp)
            return null;
        // Check expiry
        if (Date.now() - parseInt(timestamp) > EXPIRY_MS) {
            return null; // Expired
        }
        return { consultantId };
    }
    catch (error) {
        return null;
    }
}
