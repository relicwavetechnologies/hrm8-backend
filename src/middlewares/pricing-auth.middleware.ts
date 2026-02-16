/**
 * Pricing Authorization Middleware
 * Handles access control for pricing management based on admin roles
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

/**
 * Require user to be a Global Admin
 * Used for: Creating/editing price books, enterprise overrides, global settings
 */
export const requireGlobalAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if hrm8User is present (populated by authenticateHrm8)
    const hrm8User = req.hrm8User;

    if (!hrm8User) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. HRM8 staff only.'
      });
    }

    if (hrm8User.role !== 'GLOBAL_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Global admin privileges required.'
      });
    }

    next();
  } catch (error) {
    console.error('Global admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

/**
 * Require user to be either Global Admin or Regional Licensee
 * Used for: Viewing pricing, managing regional data
 */
export const requireRegionalOrGlobalAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hrm8User = req.hrm8User;

    if (!hrm8User) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. HRM8 staff only.'
      });
    }

    // Allow both GLOBAL_ADMIN and REGIONAL_LICENSEE
    if (hrm8User.role !== 'GLOBAL_ADMIN' && hrm8User.role !== 'REGIONAL_LICENSEE') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

/**
 * Validate that regional admin can only access their region's data
 * Should be called after requireRegionalOrGlobalAdmin
 */
export const validateRegionalAccess = (resourceRegionId?: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const hrm8User = req.hrm8User;

    if (!hrm8User) {
      return res.status(403).json({
        success: false,
        message: 'Admin authorization required'
      });
    }

    // Global admin can access everything
    if (hrm8User.role === 'GLOBAL_ADMIN') {
      return next();
    }

    // Regional admin can only access their assigned regions
    if (hrm8User.role === 'REGIONAL_LICENSEE') {
      // Use assignedRegionIds populated by authenticateHrm8
      // Note: express.d.ts doesn't have assignedRegionIds on Request by default unless we cast to Hrm8AuthenticatedRequest
      // But we added user properties to global Request, let's see if we added assignedRegionIds?
      // No, we added hrm8User. assignedRegionIds is on Hrm8AuthenticatedRequest interface.
      // So we should cast req to Hrm8AuthenticatedRequest or use any.

      const assignedRegionIds = (req as any).assignedRegionIds || [];

      if (assignedRegionIds.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Regional admin must be assigned to at least one region'
        });
      }

      // If resource region is specified and doesn't match
      if (resourceRegionId && !assignedRegionIds.includes(resourceRegionId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access data from your assigned regions.'
        });
      }

      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Invalid admin role'
    });
  };
};

/**
 * Helper to filter query by region for regional admins
 */
export const applyRegionalFilter = (
  req: Request,
  where: any = {}
): any => {
  const hrm8User = req.hrm8User;

  // Global admin sees all
  if (!hrm8User || hrm8User.role === 'GLOBAL_ADMIN') {
    return where;
  }

  // Regional admin filtered by region
  if (hrm8User.role === 'REGIONAL_LICENSEE') {
    const assignedRegionIds = (req as any).assignedRegionIds || [];
    return {
      ...where,
      region_id: { in: assignedRegionIds }
    };
  }

  return where;
};
