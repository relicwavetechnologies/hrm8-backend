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
        // 1. Try Cookie
        const cookieHeader = req.headers.cookie;
        let sessionId: string | false | null = null;

        if (cookieHeader) {
            const cookies = parse(cookieHeader);
            const sessionCookieName = 'sessionId';
            const signedSessionId = cookies[sessionCookieName];

            if (signedSessionId) {
                sessionId = cookieParser.signedCookie(signedSessionId, env.SESSION_SECRET);
            }
        }

        // 2. Try Query Param (token) if cookie failed
        if (!sessionId) {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            // If the token is the raw sessionId (unsigned) or a JWT, we need to handle it.
            // Assuming it might be the raw session ID for now as we use DB sessions.
            // Or it could be a signed cookie value passed as token.
            // For simplicity, let's assume if it's passed as token, it's the raw session ID.
            if (token) {
                sessionId = token;
            }
        }

        if (!sessionId) {
            console.warn('WS Auth Failed: No valid session ID found in cookie or query param');
            return null;
        }

        // Lookup session in DB
        // We have different session models: Session (User), CandidateSession, ConsultantSession, HRM8Session
        // We need to check all or know which one.
        // The sessionId in the cookie should correspond to a record in one of these tables.
        // OR, if we are using JWT in cookie (stateless), we verify token.
        // The 'session.ts' file said "Custom session store using database".

        // Let's check `Session` table first.
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

        // Check Candidate Session
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

        // Check Consultant Session
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
