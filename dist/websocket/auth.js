"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateWebSocket = authenticateWebSocket;
const cookie_1 = require("cookie");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("../config/env");
const session_repository_1 = require("../modules/auth/session.repository");
async function authenticateWebSocket(req) {
    try {
        const cookieHeader = req.headers.cookie;
        const cookies = cookieHeader ? (0, cookie_1.parse)(cookieHeader) : {};
        // 1. Try to find a sessionId from various possible cookie names
        let sessionId = null;
        // Priority: 'sessionId' (Web App) > 'candidateSessionId' (Candidate App)
        const possibleCookies = ['sessionId', 'candidateSessionId', 'hrm8SessionId', 'consultantToken'];
        for (const name of possibleCookies) {
            const value = cookies[name];
            if (value) {
                // Try to unsign if it looks like a signed cookie (starts with s:)
                if (value.startsWith('s:')) {
                    const unsigned = cookie_parser_1.default.signedCookie(value, env_1.env.SESSION_SECRET);
                    if (unsigned && typeof unsigned === 'string') {
                        sessionId = unsigned;
                        break;
                    }
                }
                else {
                    // Use as is if not signed
                    sessionId = value;
                    break;
                }
            }
        }
        // 2. Try Query Param (token) if cookie failed
        if (!sessionId) {
            const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
            sessionId = url.searchParams.get('token') || url.searchParams.get('sessionId');
        }
        if (!sessionId) {
            // console.warn('WS Auth Failed: No valid session ID found');
            return null;
        }
        // console.log('[WS Auth] Session ID found:', sessionId.substring(0, 10) + '...');
        // 3. Check Candidate Session FIRST (since candidateSessionId cookie exists)
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../utils/prisma')));
        // console.log('[WS Auth] Checking candidateSession table FIRST...');
        const candidateSession = await prisma.candidateSession.findUnique({
            where: { session_id: sessionId },
            include: { candidate: true }
        });
        if (candidateSession && candidateSession.expires_at > new Date()) {
            // console.log('[WS Auth] Found CANDIDATE session for:', candidateSession.email);
            return {
                userId: candidateSession.candidate_id,
                email: candidateSession.email,
                userType: 'CANDIDATE',
                name: `${candidateSession.candidate.first_name} ${candidateSession.candidate.last_name}`
            };
        }
        // console.log('[WS Auth] No candidate session found, checking employer session...');
        // 4. Lookup via SessionRepository (Employers/HR users)
        const session = await session_repository_1.sessionRepository.findBySessionId(sessionId);
        if (session) {
            // console.log('[WS Auth] Found EMPLOYER session for:', session.email);
            return {
                userId: session.userId,
                email: session.email,
                name: session.name || session.email.split('@')[0],
                userType: 'USER', // Employers use the main session table
            };
        }
        // 5. Check Consultant Session
        const consultantSession = await prisma.consultantSession.findUnique({
            where: { session_id: sessionId },
            include: { consultant: true }
        });
        if (consultantSession && consultantSession.expires_at > new Date()) {
            return {
                userId: consultantSession.consultant_id,
                email: consultantSession.email,
                userType: 'CONSULTANT',
                name: `${consultantSession.consultant.first_name} ${consultantSession.consultant.last_name}`
            };
        }
        return null;
    }
    catch (error) {
        console.error('WebSocket Auth Error:', error);
        return null;
    }
}
