import { IncomingMessage } from 'http';
import { parse } from 'cookie';
import cookieParser from 'cookie-parser';
import { env } from '../config/env';
import { sessionRepository } from '../modules/auth/session.repository';
import { UserRole } from '@prisma/client';

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
        let sessionId: string | null = null;

        // Priority: 'sessionId' (Web App) > 'candidateSessionId' (Candidate App)
        const possibleCookies = ['sessionId', 'candidateSessionId', 'hrm8SessionId', 'consultantToken'];

        for (const name of possibleCookies) {
            const value = cookies[name];
            if (value) {
                // Try to unsign if it looks like a signed cookie (starts with s:)
                if (value.startsWith('s:')) {
                    const unsigned = cookieParser.signedCookie(value, env.SESSION_SECRET);
                    if (unsigned && typeof unsigned === 'string') {
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
            // console.warn('WS Auth Failed: No valid session ID found');
            return null;
        }

        // console.log('[WS Auth] Session ID found:', sessionId.substring(0, 10) + '...');

        // 3. Check Candidate Session FIRST (since candidateSessionId cookie exists)
        const { prisma } = await import('../utils/prisma');

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
        const session = await sessionRepository.findBySessionId(sessionId);
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
    } catch (error) {
        console.error('WebSocket Auth Error:', error);
        return null;
    }
}
