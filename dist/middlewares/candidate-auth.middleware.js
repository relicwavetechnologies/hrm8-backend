"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateCandidate = authenticateCandidate;
const candidate_repository_1 = require("../modules/candidate/candidate.repository");
const session_1 = require("../utils/session");
async function authenticateCandidate(req, res, next) {
    try {
        const sessionId = req.cookies?.candidateSessionId;
        if (!sessionId) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated. Please login.',
            });
            return;
        }
        const candidateRepository = new candidate_repository_1.CandidateRepository();
        const session = await candidateRepository.findSessionBySessionId(sessionId);
        if (!session || session.expires_at < new Date()) {
            res.clearCookie('candidateSessionId', (0, session_1.getSessionCookieOptions)());
            res.status(401).json({
                success: false,
                error: 'Invalid or expired session. Please login again.',
            });
            return;
        }
        req.candidate = {
            id: session.candidate.id,
            email: session.candidate.email,
            firstName: session.candidate.first_name,
            lastName: session.candidate.last_name,
        };
        next();
    }
    catch (error) {
        console.error('[authenticateCandidate] Error:', error);
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
        });
    }
}
