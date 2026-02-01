import { IncomingMessage } from 'http';
import { parse } from 'cookie';
import cookieParser from 'cookie-parser';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';

export interface WebSocketAuthResult {
    email: string;
    userId: string;
    userType: 'USER' | 'CANDIDATE' | 'CONSULTANT' | 'HRM8';
    name: string;
}

export async function authenticateWebSocket(req: IncomingMessage): Promise<WebSocketAuthResult | null> {
    try {
        const cookieHeader = req.headers.cookie;
        const cookies = cookieHeader ? parse(cookieHeader) : {};

        // 1. Try to find a sessionId from various possible cookie names
        // Note: In development, these might be unsigned if set via res.cookie without secret
        // or if cookieParser is not used in the same way for these specific cookies.
        let sessionId: string | null = null;

        const possibleCookies = ['candidateSessionId', 'hrm8SessionId', 'sessionId', 'consultantToken'];

        for (const name of possibleCookies) {
            const value = cookies[name];
            if (value) {
                // Try to unsign if it looks like a signed cookie (starts with s:)
                if (value.startsWith('s:')) {
                    const unsigned = cookieParser.signedCookie(value, env.SESSION_SECRET);
                    if (unsigned) {
                        sessionId = unsigned;
                        break;
                    }
                } else {
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
            console.warn('WS Auth Failed: No valid session ID found');
            return null;
        }

        // 3. Lookup in various session tables

        // Try Candidate Session
        const candidateSession = await prisma.candidateSession.findUnique({
            where: { session_id: sessionId },
            include: { candidate: true }
        });

        if (candidateSession && candidateSession.expires_at > new Date()) {
            return {
                userId: candidateSession.candidate_id,
                email: candidateSession.email,
                userType: 'CANDIDATE',
                name: `${candidateSession.candidate.first_name} ${candidateSession.candidate.last_name}`
            };
        }

        // Try HRM8 Session
        const hrm8Session = await prisma.hRM8Session.findUnique({
            where: { session_id: sessionId },
            include: { user: true }
        });

        if (hrm8Session && hrm8Session.expires_at > new Date()) {
            return {
                userId: hrm8Session.hrm8_user_id,
                email: hrm8Session.user.email,
                userType: 'HRM8',
                name: `${hrm8Session.user.first_name} ${hrm8Session.user.last_name}`
            };
        }

        // Try Regular User Session
        const userSession = await prisma.session.findUnique({
            where: { session_id: sessionId },
            include: { user: true }
        });

        if (userSession && userSession.expires_at > new Date()) {
            return {
                userId: userSession.user_id,
                email: userSession.email,
                userType: 'USER',
                name: userSession.user.name
            };
        }

        // Try Consultant Session
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
    } catch (error) {
        console.error('WebSocket Auth Error:', error);
        return null;
    }
}
