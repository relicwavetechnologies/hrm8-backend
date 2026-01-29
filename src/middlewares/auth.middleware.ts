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
    let sessionId = req.cookies?.sessionId;

    if (!sessionId && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.substring(7);
      }
    }

    if (!sessionId) {
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

    // Update last activity
    await sessionRepository.updateBySessionId(sessionId);


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
