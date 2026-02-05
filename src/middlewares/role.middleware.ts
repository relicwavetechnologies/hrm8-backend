import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';

/**
 * Middleware to require admin role or above
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
    return;
  }

  const userRole = req.user.role;

  // Check if user is ADMIN or SUPER_ADMIN
  if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: 'Admin access required',
  });
}

/**
 * Middleware to require super admin role
 */
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
    return;
  }

  if (req.user.role === UserRole.SUPER_ADMIN) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: 'Super admin access required',
  });
}

/**
 * Middleware to require a specific role
 */
export function requireRole(role: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    if (req.user.role === role) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: `${role} access required`,
    });
  };
}
