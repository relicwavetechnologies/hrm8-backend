import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, Hrm8AuthenticatedRequest } from '../types';
import { authenticate } from './auth.middleware';
import { authenticateConsultant } from './consultant-auth.middleware';
import { authenticateHrm8 } from './hrm8-auth.middleware';
import { authenticateCandidate } from './candidate-auth.middleware';

/**
 * Middleware that attempts to authenticate as ANY user type (User, Consultant, HRM8 Admin, etc.)
 * based on presence of specific cookies.
 * Helpful for shared resources like Notifications.
 */
export async function authenticateUnified(
    req: AuthenticatedRequest & Hrm8AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {

    // Check for HRM8 Session
    if (req.cookies?.hrm8SessionId) {
        return authenticateHrm8(req, res, next);
    }

    // Check for Candidate Session
    if (req.cookies?.candidateSessionId) {
        return authenticateCandidate(req as any, res, next);
    }

    // Check for Consultant Token (Header or Cookie)
    // Consultant auth middleware checks Authorization header, so we should too.
    if (req.headers.authorization || req.cookies?.consultantToken) {
        return authenticateConsultant(req as any, res, next);
    }

    // Check for User Session (Default)
    if (req.cookies?.sessionId) {
        return authenticate(req, res, next);
    }

    // Fallback / No Credentials
    res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
    });
}
