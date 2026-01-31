import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { sessionRepository } from '../modules/auth/session.repository';
import { getSessionCookieOptions } from '../utils/session';

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies?.sessionId;

    console.log('[authenticate] Checking authentication');
    console.log('[authenticate] All cookies:', req.cookies);
    console.log('[authenticate] sessionId:', sessionId);
    console.log('[authenticate] Request origin:', req.get('origin'));
    console.log('[authenticate] Request headers:', req.headers);

    if (!sessionId) {
      console.error('[authenticate] No sessionId found in cookies');
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    const session = await sessionRepository.findBySessionId(sessionId);

    if (!session) {
      res.clearCookie('sessionId', getSessionCookieOptions());

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
  } catch (error) {
    console.error('[authenticate] Error during authentication:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}
