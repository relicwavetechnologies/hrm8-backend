import { Response, NextFunction, Request } from 'express';
import { Hrm8AuthenticatedRequest } from '../types';
import { Hrm8Repository } from '../modules/hrm8/hrm8.repository';
import { getSessionCookieOptions } from '../utils/session';

export async function authenticateHrm8(
  req: Request,
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

    if (!session.user) {
      res.status(401).json({
        success: false,
        error: 'Session data corrupted. Please login again.',
      });
      return;
    }


    let assignedRegionIds: string[] | undefined = undefined;
    if (session.user.role === 'REGIONAL_LICENSEE' && session.user.licensee_id) {
      const regions = await hrm8Repository.getRegionsForLicensee(session.user.licensee_id);
      assignedRegionIds = regions.map(r => r.id);
    }

    (req as Hrm8AuthenticatedRequest).hrm8User = {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.first_name,
      lastName: session.user.last_name,
      role: session.user.role,
      licenseeId: session.user.licensee_id || undefined,
    };
    (req as Hrm8AuthenticatedRequest).assignedRegionIds = assignedRegionIds;

    // Populate req.user for backward compatibility with controllers expecting AuthenticatedRequest
    // We cast to any to avoid strict type checks here, assuming legacy controllers just need basic info like id/email
    (req as any).user = {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.first_name,
      lastName: session.user.last_name,
      role: session.user.role,
    };

    next();
  } catch (error) {
    console.error('[authenticateHrm8] Error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Middleware to require specific HRM8 roles
 * @param allowedRoles - Array of allowed roles (e.g., ['GLOBAL_ADMIN', 'REGIONAL_LICENSEE'])
 */
export function requireHrm8Role(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const hrm8Req = req as Hrm8AuthenticatedRequest;
    if (!hrm8Req.hrm8User) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(hrm8Req.hrm8User.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}

