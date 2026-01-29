import { Response, NextFunction } from 'express';
import { UnifiedAuthenticatedRequest } from '../types';
import { sessionRepository } from '../modules/auth/session.repository';
import { CandidateRepository } from '../modules/candidate/candidate.repository';
import { getSessionCookieOptions } from '../utils/session';

export async function unifiedAuthenticate(
    req: UnifiedAuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const staffSessionId = req.cookies?.sessionId;
        const candidateSessionId = req.cookies?.candidateSessionId;

        // 1. Try Staff Authentication (Priority 1)
        if (staffSessionId) {
            const session = await sessionRepository.findBySessionId(staffSessionId);
            if (session) {
                // Update activity
                await sessionRepository.updateBySessionId(staffSessionId);

                req.user = {
                    id: session.userId,
                    email: session.email,
                    name: session.name,
                    companyId: session.companyId,
                    role: session.userRole,
                    type: session.companyId ? 'COMPANY' : undefined,
                };
                return next();
            }
        }

        // 2. Try Candidate Authentication (Priority 2)
        if (candidateSessionId) {
            const candidateRepository = new CandidateRepository();
            const session = await candidateRepository.findSessionBySessionId(candidateSessionId);

            if (session && session.expires_at > new Date()) {
                // Update activity
                await candidateRepository.updateSessionBySessionId(candidateSessionId);

                req.candidate = {
                    id: session.candidate.id,
                    email: session.candidate.email,
                    firstName: session.candidate.first_name,
                    lastName: session.candidate.last_name,
                };

                // Important: Only populate req.user if staff is not already present
                // This maintains compatibility for shared controllers while respecting priority
                if (!req.user) {
                    req.user = {
                        id: session.candidate.id,
                        email: session.candidate.email,
                        name: `${session.candidate.first_name} ${session.candidate.last_name}`,
                        type: 'CANDIDATE',
                    };
                }

                return next();
            }
        }

        // 3. Fallback: Not authenticated
        res.status(401).json({
            success: false,
            error: 'Not authenticated. Please login.',
        });
    } catch (error) {
        console.error('[unifiedAuthenticate] Error:', error);
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
        });
    }
}
