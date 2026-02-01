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
    console.log('[authenticateUnified] Checking authentication');
    console.log('[authenticateUnified] Available cookies:', Object.keys(req.cookies || {}));

    // Check for HRM8 Session
    if (req.cookies?.hrm8SessionId) {
        console.log('[authenticateUnified] Found hrm8SessionId, using HRM8 auth');
        return authenticateHrm8(req, res, next);
    }

    // Check for Candidate Session
    if (req.cookies?.candidateSessionId) {
        console.log('[authenticateUnified] Found candidateSessionId, using Candidate auth');
        return authenticateCandidate(req as any, res, next);
    }

    // Check for Consultant Token (Header or Cookie)
    // Consultant auth middleware checks Authorization header, so we should too.
    if (req.headers.authorization || req.cookies?.consultantToken) {
        console.log('[authenticateUnified] Found consultant token/header, using consultant auth');
        return authenticateConsultant(req as any, res, next);
    }

    // Check for User Session (Default)
    if (req.cookies?.sessionId) {
        console.log('[authenticateUnified] Found sessionId, using regular auth');
        return authenticate(req, res, next);
    }

    // Fallback / No Credentials
    console.error('[authenticateUnified] No authentication credentials found');
    res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
    });
}
