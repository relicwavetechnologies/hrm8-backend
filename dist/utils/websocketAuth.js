"use strict";
/**
 * WebSocket Authentication Helper
 * Verifies session cookies from WebSocket upgrade request
 * Supports all user types: USER, CANDIDATE, CONSULTANT, HRM8
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateWebSocket = authenticateWebSocket;
const Session_1 = require("../models/Session");
const CandidateSession_1 = require("../models/CandidateSession");
const User_1 = require("../models/User");
const Candidate_1 = require("../models/Candidate");
const prisma_1 = require("../lib/prisma");
/**
 * Parse cookies from request headers
 */
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader)
        return cookies;
    cookieHeader.split(';').forEach((cookie) => {
        const trimmed = cookie.trim();
        if (!trimmed)
            return;
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex === -1)
            return;
        const name = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        if (name && value) {
            // Decode URL-encoded values
            try {
                cookies[name] = decodeURIComponent(value);
            }
            catch {
                cookies[name] = value;
            }
        }
    });
    return cookies;
}
/**
 * Authenticate WebSocket connection using session cookies
 */
async function authenticateWebSocket(req) {
    try {
        const cookieHeader = req.headers.cookie;
        const cookies = parseCookies(cookieHeader);
        // Try User session first
        if (cookies.sessionId) {
            const session = await Session_1.SessionModel.findBySessionId(cookies.sessionId);
            if (session) {
                // Check if session is expired
                if (session.expiresAt < new Date()) {
                    console.log('❌ User session expired');
                }
                else {
                    // Get user details
                    const user = await User_1.UserModel.findById(session.userId);
                    if (!user) {
                        console.log('❌ User not found');
                    }
                    else {
                        // Update last activity
                        await Session_1.SessionModel.updateLastActivity(cookies.sessionId);
                        return {
                            email: session.email,
                            userId: session.userId,
                            userType: 'USER',
                            name: user.name,
                            companyId: session.companyId,
                        };
                    }
                }
            }
        }
        // Try Candidate session
        if (cookies.candidateSessionId) {
            const session = await CandidateSession_1.CandidateSessionModel.findBySessionId(cookies.candidateSessionId);
            if (session) {
                // Check if session is expired
                if (session.expiresAt < new Date()) {
                    console.log('❌ Candidate session expired');
                }
                else {
                    // Get candidate details
                    const candidate = await Candidate_1.CandidateModel.findById(session.candidateId);
                    if (!candidate) {
                        console.log('❌ Candidate not found');
                    }
                    else {
                        // Update last activity
                        await CandidateSession_1.CandidateSessionModel.updateLastActivity(cookies.candidateSessionId);
                        return {
                            email: session.email,
                            userId: session.candidateId,
                            userType: 'CANDIDATE',
                            name: `${candidate.firstName} ${candidate.lastName}`,
                        };
                    }
                }
            }
        }
        // Try Consultant session
        if (cookies.consultantSessionId) {
            const session = await prisma_1.prisma.consultantSession.findUnique({
                where: { session_id: cookies.consultantSessionId },
            });
            if (session) {
                // Check if session is expired
                if (session.expires_at < new Date()) {
                    console.log('❌ Consultant session expired');
                }
                else {
                    // Get consultant details
                    const consultant = await prisma_1.prisma.consultant.findUnique({
                        where: { id: session.consultant_id },
                    });
                    if (!consultant) {
                        console.log('❌ Consultant not found');
                    }
                    else {
                        // Update last activity
                        await prisma_1.prisma.consultantSession.update({
                            where: { session_id: cookies.consultantSessionId },
                            data: { last_activity: new Date() },
                        });
                        return {
                            email: session.email,
                            userId: session.consultant_id,
                            userType: 'CONSULTANT',
                            name: `${consultant.first_name} ${consultant.last_name}`,
                        };
                    }
                }
            }
        }
        // Try HRM8 session
        if (cookies.hrm8SessionId) {
            const session = await prisma_1.prisma.hRM8Session.findUnique({
                where: { session_id: cookies.hrm8SessionId },
            });
            if (session) {
                // Check if session is expired
                if (session.expires_at < new Date()) {
                    console.log('❌ HRM8 session expired');
                }
                else {
                    // Get HRM8 user details with their regions
                    const hrm8User = await prisma_1.prisma.hRM8User.findUnique({
                        where: { id: session.hrm8_user_id },
                    });
                    if (!hrm8User) {
                        console.log('❌ HRM8 user not found');
                    }
                    else {
                        // Update last activity
                        await prisma_1.prisma.hRM8Session.update({
                            where: { session_id: cookies.hrm8SessionId },
                            data: { last_activity: new Date() },
                        });
                        // Get region IDs if regional licensee
                        let regionIds = [];
                        if (hrm8User.role === 'REGIONAL_LICENSEE' && hrm8User.licensee_id) {
                            const regions = await prisma_1.prisma.region.findMany({
                                where: { licensee_id: hrm8User.licensee_id },
                                select: { id: true },
                            });
                            regionIds = regions.map(r => r.id);
                        }
                        return {
                            email: session.email,
                            userId: session.hrm8_user_id,
                            userType: 'HRM8',
                            name: `${hrm8User.first_name} ${hrm8User.last_name}`,
                            regionIds,
                        };
                    }
                }
            }
        }
        return null;
    }
    catch (error) {
        console.error('❌ WebSocket authentication error:', error);
        return null;
    }
}
