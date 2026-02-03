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

    console.log('[authenticateHrm8] Checking authentication');
    console.log('[authenticateHrm8] All cookies:', req.cookies);
    console.log('[authenticateHrm8] hrm8SessionId:', sessionId);
    console.log('[authenticateHrm8] Request origin:', req.get('origin'));

    if (!sessionId) {
      console.error('[authenticateHrm8] No hrm8SessionId found in cookies');
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    const hrm8Repository = new Hrm8Repository();
    const session = await hrm8Repository.findSessionBySessionId(sessionId);

    if (!session || session.expires_at < new Date()) {
      console.error('[authenticateHrm8] Session invalid or expired');
      res.clearCookie('hrm8SessionId', getSessionCookieOptions());

      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please login again.',
      });
      return;
    }

    if (!session.user) {
      console.error('[authenticateHrm8] Session found but user relation is null/undefined');
      res.status(401).json({
        success: false,
        error: 'Session data corrupted. Please login again.',
      });
      return;
    }

    console.log('[authenticateHrm8] Session validated, user:', session.user.email);

    let assignedRegionIds: string[] | undefined = undefined;
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

    console.log('[authenticateHrm8] Authentication successful for user:', session.user.email);
    next();
  } catch (error) {
    console.error('[authenticateHrm8] Error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}
