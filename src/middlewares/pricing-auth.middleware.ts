/**
 * Pricing Authorization Middleware
 * Handles access control for pricing management based on admin roles
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

// Extend Express Request to include hrm8User
declare global {
  namespace Express {
    interface Request {
      hrm8User?: {
        id: string;
        user_id: string;
        role: 'GLOBAL_ADMIN' | 'REGIONAL_LICENSEE';
        status: string;
        region_id: string | null;
      };
    }
  }
}

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
    const user = req.user;
    
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is HRM8 staff
    const hrm8User = await prisma.hrm8User.findUnique({
      where: { user_id: user.id },
      select: { 
        id: true,
        user_id: true,
        role: true, 
        status: true,
        region_id: true
      }
    });

    if (!hrm8User) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HRM8 staff only.'
      });
    }

    if (hrm8User.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Account not active.'
      });
    }

    if (hrm8User.role !== 'GLOBAL_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Global admin privileges required.'
      });
    }

    // Attach hrm8User to request for use in controllers
    req.hrm8User = hrm8User as any;

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
    const user = req.user;
    
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is HRM8 staff
    const hrm8User = await prisma.hrm8User.findUnique({
      where: { user_id: user.id },
      select: { 
        id: true,
        user_id: true,
        role: true, 
        status: true,
        region_id: true
      }
    });

    if (!hrm8User) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HRM8 staff only.'
      });
    }

    if (hrm8User.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Account not active.'
      });
    }

    // Allow both GLOBAL_ADMIN and REGIONAL_LICENSEE
    if (hrm8User.role !== 'GLOBAL_ADMIN' && hrm8User.role !== 'REGIONAL_LICENSEE') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Attach hrm8User to request for use in controllers
    req.hrm8User = hrm8User as any;

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

    // Regional admin can only access their region
    if (hrm8User.role === 'REGIONAL_LICENSEE') {
      if (!hrm8User.region_id) {
        return res.status(403).json({
          success: false,
          message: 'Regional admin must be assigned to a region'
        });
      }

      // If resource region is specified and doesn't match
      if (resourceRegionId && resourceRegionId !== hrm8User.region_id) {
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
  
  // Global admin sees all
  if (!hrm8User || hrm8User.role === 'GLOBAL_ADMIN') {
    return where;
  }
  
  // Regional admin filtered by region
  if (hrm8User.role === 'REGIONAL_LICENSEE' && hrm8User.region_id) {
    return {
      ...where,
      region_id: hrm8User.region_id
    };
  }
  
  return where;
};
