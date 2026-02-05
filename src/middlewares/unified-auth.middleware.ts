import { Response, NextFunction } from 'express';
import { UnifiedAuthenticatedRequest } from '../types';
import { authenticate } from './auth.middleware';
import { authenticateConsultant } from './consultant-auth.middleware';
import { authenticateHrm8 } from './hrm8-auth.middleware';
import { authenticateCandidate } from './candidate-auth.middleware';

/**
 * Unified auth middleware
 * Priority: HRM8 -> Candidate -> Consultant -> Staff
 */
export async function unifiedAuthenticate(
  req: UnifiedAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.cookies?.hrm8SessionId || req.headers.authorization) {
      return authenticateHrm8(req as any, res, next);
    }

    if (req.cookies?.candidateSessionId) {
      return authenticateCandidate(req as any, res, next);
    }

    if (req.cookies?.consultantSessionId || req.headers.authorization) {
      return authenticateConsultant(req as any, res, next);
    }

    if (req.cookies?.sessionId) {
      return authenticate(req as any, res, next);
    }

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
