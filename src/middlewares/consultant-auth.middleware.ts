import { Response, NextFunction } from 'express';
import { ConsultantAuthenticatedRequest } from '../types';
import { ConsultantRepository } from '../modules/consultant/consultant.repository';
import { getSessionCookieOptions } from '../utils/session';

export async function authenticateConsultant(
  req: ConsultantAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies?.consultantSessionId;

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    const consultantRepository = new ConsultantRepository();
    const session = await consultantRepository.findSessionBySessionId(sessionId);

    if (!session || session.expires_at < new Date()) {
      res.clearCookie('consultantSessionId', getSessionCookieOptions());

      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please login again.',
      });
      return;
    }

    req.consultant = {
      id: session.consultant.id,
      email: session.consultant.email,
      firstName: session.consultant.first_name,
      lastName: session.consultant.last_name,
    };

    next();
  } catch (error) {
    console.error('[authenticateConsultant] Error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}
