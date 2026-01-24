import { Response, NextFunction } from 'express';
import { Hrm8AuthenticatedRequest } from '../types';
import { Hrm8Repository } from '../modules/hrm8/hrm8.repository';
import { getSessionCookieOptions } from '../utils/session';

export async function authenticateHrm8(
  req: Hrm8AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies?.hrm8SessionId;

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    const hrm8Repository = new Hrm8Repository();
    const session = await hrm8Repository.findSessionBySessionId(sessionId);

    if (!session || session.expires_at < new Date()) {
      res.clearCookie('hrm8SessionId', getSessionCookieOptions());

      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please login again.',
      });
      return;
    }

    let assignedRegionIds: string[] = [];
    if (session.user.role === 'REGIONAL_LICENSEE' && session.user.licensee_id) {
        const regions = await hrm8Repository.getRegionsForLicensee(session.user.licensee_id);
        assignedRegionIds = regions.map(r => r.id);
    }

    req.hrm8User = {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.first_name,
      lastName: session.user.last_name,
      role: session.user.role,
      licenseeId: session.user.licensee_id || undefined,
    };
    req.assignedRegionIds = assignedRegionIds;

    next();
  } catch (error) {
    console.error('[authenticateHrm8] Error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}
