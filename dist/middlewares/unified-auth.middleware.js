"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUnified = authenticateUnified;
const auth_middleware_1 = require("./auth.middleware");
const consultant_auth_middleware_1 = require("./consultant-auth.middleware");
const hrm8_auth_middleware_1 = require("./hrm8-auth.middleware");
const candidate_auth_middleware_1 = require("./candidate-auth.middleware");
/**
 * Middleware that attempts to authenticate as ANY user type (User, Consultant, HRM8 Admin, etc.)
 * based on presence of specific cookies.
 * Helpful for shared resources like Notifications.
 */
async function authenticateUnified(req, res, next) {
    // Check for HRM8 Session
    if (req.cookies?.hrm8SessionId) {
        return (0, hrm8_auth_middleware_1.authenticateHrm8)(req, res, next);
    }
    // Check for Candidate Session
    if (req.cookies?.candidateSessionId) {
        return (0, candidate_auth_middleware_1.authenticateCandidate)(req, res, next);
    }
    // Check for Consultant Token (Header or Cookie)
    // Consultant auth middleware checks Authorization header, so we should too.
    if (req.headers.authorization || req.cookies?.consultantToken) {
        return (0, consultant_auth_middleware_1.authenticateConsultant)(req, res, next);
    }
    // Check for User Session (Default)
    if (req.cookies?.sessionId) {
        return (0, auth_middleware_1.authenticate)(req, res, next);
    }
    // Fallback / No Credentials
    res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
    });
}
