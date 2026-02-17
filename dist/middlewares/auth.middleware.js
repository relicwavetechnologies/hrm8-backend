"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const session_repository_1 = require("../modules/auth/session.repository");
const session_1 = require("../utils/session");
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        let token = req.cookies.auth_token;
        const sessionId = req.cookies.sessionId;
        // Bearer token helper (if we still support JWTs/Tokens directly)
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        // console.log('[authenticate] Checking authentication');
        // console.log('[authenticate] All cookies:', req.cookies);
        // 1. Try Session ID (Primary for Web App)
        if (sessionId) {
            const session = await session_repository_1.sessionRepository.findBySessionId(sessionId);
            if (!session) {
                // console.warn('[authenticate] Session not found or expired for ID:', sessionId);
                res.clearCookie('sessionId', (0, session_1.getSessionCookieOptions)());
                res.status(401).json({
                    success: false,
                    error: 'Session expired or invalid',
                });
                return;
            }
            req.user = {
                id: session.userId,
                email: session.email,
                companyId: session.companyId,
                role: session.userRole,
                type: 'COMPANY', // Defaulting to COMPANY for now, schema might differ
            };
            return next();
        }
        // 2. Fallback: Try JWT Token (if needed for API/mobile)
        if (token) {
            // ... existing JWT logic if we want to keep it ...
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                req.user = {
                    id: decoded.userId,
                    email: decoded.email,
                    companyId: decoded.companyId,
                    role: decoded.role,
                    type: decoded.type,
                };
                return next();
            }
            catch (e) {
                // console.warn('[authenticate] Invalid JWT token');
            }
        }
        // console.error('[authenticate] No valid session or token found');
        res.status(401).json({
            success: false,
            error: 'Not authenticated. Please login.',
        });
        return;
    }
    catch (error) {
        // console.error('[authenticate] Error during authentication:', error);
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
        });
    }
}
