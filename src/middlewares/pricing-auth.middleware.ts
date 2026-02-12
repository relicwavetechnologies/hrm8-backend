/**
 * Pricing Authorization Middleware
 * Handles access control for pricing management based on admin roles.
 * Must be used after authenticateHrm8 (req.hrm8User must be set).
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Require user to be a Global Admin
 * Used for: Creating/editing price books, enterprise overrides, global settings
 */
export const requireGlobalAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const hrm8User = req.hrm8User;
  if (!hrm8User) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  if (hrm8User.role !== 'GLOBAL_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Global admin privileges required.'
    });
  }
  next();
};

/**
 * Require user to be either Global Admin or Regional Licensee
 * Used for: Viewing pricing, managing regional data
 */
export const requireRegionalOrGlobalAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const hrm8User = req.hrm8User;
  if (!hrm8User) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  if (hrm8User.role !== 'GLOBAL_ADMIN' && hrm8User.role !== 'REGIONAL_LICENSEE') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
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

    // Regional admin: use licenseeId for region check (region_id from express.d.ts)
    const regionId = hrm8User.region_id;
    if (hrm8User.role === 'REGIONAL_LICENSEE') {
      if (!regionId && !hrm8User.licenseeId) {
        return res.status(403).json({
          success: false,
          message: 'Regional admin must be assigned to a region'
        });
      }

      if (resourceRegionId && regionId && resourceRegionId !== regionId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access data from your assigned region.'
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
  
  if (!hrm8User || hrm8User.role === 'GLOBAL_ADMIN') {
    return where;
  }
  
  if (hrm8User.role === 'REGIONAL_LICENSEE' && hrm8User.region_id) {
    return {
      ...where,
      region_id: hrm8User.region_id
    };
  }
  
  return where;
};
