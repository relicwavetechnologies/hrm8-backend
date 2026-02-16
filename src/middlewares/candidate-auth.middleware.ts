import { Request, Response, NextFunction } from 'express';
import { CandidateAuthenticatedRequest } from '../types';
import { CandidateRepository } from '../modules/candidate/candidate.repository';
import { getSessionCookieOptions } from '../utils/session';

export async function authenticateCandidate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies?.candidateSessionId;

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    const candidateRepository = new CandidateRepository();
    const session = await candidateRepository.findSessionBySessionId(sessionId);

    if (!session || session.expires_at < new Date()) {
      res.clearCookie('candidateSessionId', getSessionCookieOptions());

      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please login again.',
      });
      return;
    }

    (req as any).candidate = {
      id: session.candidate.id,
      email: session.candidate.email,
      firstName: session.candidate.first_name,
      lastName: session.candidate.last_name,
    };

    next();
  } catch (error) {
    console.error('[authenticateCandidate] Error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}
