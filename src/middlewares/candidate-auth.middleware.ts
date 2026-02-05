import { Response, NextFunction } from 'express';
import { CandidateAuthenticatedRequest } from '../types';
import { CandidateRepository } from '../modules/candidate/candidate.repository';
import { getSessionCookieOptions } from '../utils/session';

export async function authenticateCandidate(
  req: CandidateAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies?.candidateSessionId;
    console.log(`[authenticateCandidate] Checking session: ${sessionId ? 'PRESENT' : 'MISSING'}`);

    if (!sessionId) {
      console.log('[authenticateCandidate] No sessionId cookie found');
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    const candidateRepository = new CandidateRepository();
    const session = await candidateRepository.findSessionBySessionId(sessionId);

    if (!session || session.expires_at < new Date()) {
      console.log(`[authenticateCandidate] Session NOT FOUND or EXPIRED: ${sessionId}`);
      res.clearCookie('candidateSessionId', getSessionCookieOptions());

      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please login again.',
      });
      return;
    }

    // Update last activity
    await candidateRepository.updateSessionBySessionId(sessionId);

    console.log(`[authenticateCandidate] Authenticated candidate: ${session.candidate.id}`);
    req.candidate = {
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
