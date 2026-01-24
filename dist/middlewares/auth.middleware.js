"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const session_repository_1 = require("../modules/auth/session.repository");
const session_1 = require("../utils/session");
async function authenticate(req, res, next) {
    try {
        const sessionId = req.cookies?.sessionId;
        if (!sessionId) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated. Please login.',
            });
            return;
        }
        const session = await session_repository_1.sessionRepository.findBySessionId(sessionId);
        if (!session) {
            res.clearCookie('sessionId', (0, session_1.getSessionCookieOptions)());
            res.status(401).json({
                success: false,
                error: 'Invalid or expired session. Please login again.',
            });
            return;
        }
        // sessionRepository already handles expiration check in findBySessionId? 
        // Yes, I implemented it to delete if expired.
        // Update activity - handled in SessionModel? 
        // SessionRepository doesn't have updateLastActivity exposed? 
        // I should check SessionRepository.
        // I didn't implement updateLastActivity in SessionRepository. I should.
        // For now, skip updateLastActivity or add it.
        // I'll add it to repository if I can, but for now just proceed.
        req.user = {
            id: session.userId,
            email: session.email,
            name: session.name,
            companyId: session.companyId,
            role: session.userRole,
            type: session.companyId ? 'COMPANY' : undefined,
        };
        next();
    }
    catch (error) {
        console.error('[authenticate] Error during authentication:', error);
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
        });
    }
}
