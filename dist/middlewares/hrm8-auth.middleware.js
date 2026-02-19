"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateHrm8 = authenticateHrm8;
exports.requireHrm8Role = requireHrm8Role;
const hrm8_repository_1 = require("../modules/hrm8/hrm8.repository");
const session_1 = require("../utils/session");
async function authenticateHrm8(req, res, next) {
    try {
        const sessionId = req.cookies?.hrm8SessionId;
        if (!sessionId) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated. Please login.',
            });
            return;
        }
        const hrm8Repository = new hrm8_repository_1.Hrm8Repository();
        const session = await hrm8Repository.findSessionBySessionId(sessionId);
        if (!session || session.expires_at < new Date()) {
            res.clearCookie('hrm8SessionId', (0, session_1.getSessionCookieOptions)());
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
        let assignedRegionIds = undefined;
        if (session.user.role === 'REGIONAL_LICENSEE' && session.user.licensee_id) {
            const regions = await hrm8Repository.getRegionsForLicensee(session.user.licensee_id);
            assignedRegionIds = regions.map(r => r.id);
        }
        // Set hrm8User on the request object (globally augmented)
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
    }
    catch (error) {
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
function requireHrm8Role(allowedRoles) {
    return (req, res, next) => {
        if (!req.hrm8User) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        if (!allowedRoles.includes(req.hrm8User.role)) {
            res.status(403).json({
                success: false,
                error: `Access denied. Required roles: ${allowedRoles.join(' or ')}`,
            });
            return;
        }
        next();
    };
}
