"use strict";
/**
 * Pricing Authorization Middleware
 * Handles access control for pricing management based on admin roles.
 * Must be used after authenticateHrm8 (req.hrm8User must be set).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyRegionalFilter = exports.validateRegionalAccess = exports.requireRegionalOrGlobalAdmin = exports.requireGlobalAdmin = void 0;
/**
 * Require user to be a Global Admin
 * Used for: Creating/editing price books, enterprise overrides, global settings
 */
const requireGlobalAdmin = (req, res, next) => {
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
exports.requireGlobalAdmin = requireGlobalAdmin;
/**
 * Require user to be either Global Admin or Regional Licensee
 * Used for: Viewing pricing, managing regional data
 */
const requireRegionalOrGlobalAdmin = (req, res, next) => {
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
exports.requireRegionalOrGlobalAdmin = requireRegionalOrGlobalAdmin;
/**
 * Validate that regional admin can only access their region's data
 * Should be called after requireRegionalOrGlobalAdmin
 */
const validateRegionalAccess = (resourceRegionId) => {
    return (req, res, next) => {
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
exports.validateRegionalAccess = validateRegionalAccess;
/**
 * Helper to filter query by region for regional admins
 */
const applyRegionalFilter = (req, where = {}) => {
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
exports.applyRegionalFilter = applyRegionalFilter;
