"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleOAuthService = exports.GoogleOAuthService = void 0;
const prisma_1 = require("../../utils/prisma");
const env_1 = require("../../config/env");
function getUserIntegrationName(userId) {
    return `user-calendar-${userId}`;
}
class GoogleOAuthService {
    getAuthUrl(userId, companyId) {
        const clientId = env_1.env.GOOGLE_CLIENT_ID;
        const redirectUri = env_1.env.GOOGLE_REDIRECT_URI;
        const state = Buffer.from(JSON.stringify({ userId, companyId })).toString('base64');
        const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email');
        return (`https://accounts.google.com/o/oauth2/v2/auth` +
            `?client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code` +
            `&scope=${scope}` +
            `&access_type=offline` +
            `&prompt=consent` +
            `&state=${state}`);
    }
    async handleCallback(code, userId, companyId) {
        const tokens = await this.exchangeCodeForTokens(code);
        const calendarEmail = await this.getGoogleEmail(tokens.access_token);
        const existingIntegration = await prisma_1.prisma.integration.findFirst({
            where: {
                company_id: companyId,
                type: 'CALENDAR',
                name: getUserIntegrationName(userId),
            },
        });
        const configData = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: tokens.expiry_date ?? undefined,
            calendar_email: calendarEmail,
        };
        if (existingIntegration) {
            await prisma_1.prisma.integration.update({
                where: { id: existingIntegration.id },
                data: {
                    config: configData,
                    status: 'ACTIVE',
                },
            });
        }
        else {
            await prisma_1.prisma.integration.create({
                data: {
                    company_id: companyId,
                    type: 'CALENDAR',
                    name: getUserIntegrationName(userId),
                    status: 'ACTIVE',
                    config: configData,
                },
            });
        }
    }
    async getTokensForUser(userId, companyId) {
        const integration = await prisma_1.prisma.integration.findFirst({
            where: {
                company_id: companyId,
                type: 'CALENDAR',
                name: getUserIntegrationName(userId),
                status: 'ACTIVE',
            },
        });
        return integration?.config ?? null;
    }
    async isUserConnected(userId, companyId) {
        const tokens = await this.getTokensForUser(userId, companyId);
        if (!tokens)
            return { connected: false };
        return { connected: true, email: tokens.calendar_email };
    }
    async createMeetingEvent(userId, companyId, details) {
        const tokens = await this.getTokensForUser(userId, companyId);
        if (!tokens)
            return null;
        try {
            const accessToken = await this.ensureValidToken(tokens, userId, companyId);
            const eventBody = {
                summary: details.summary,
                description: details.description || '',
                start: { dateTime: details.start.toISOString(), timeZone: 'UTC' },
                end: { dateTime: details.end.toISOString(), timeZone: 'UTC' },
                attendees: details.attendees || [],
                conferenceData: {
                    createRequest: {
                        requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                },
            };
            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventBody),
            });
            if (!response.ok) {
                console.error('[GoogleOAuthService] Failed to create event:', await response.text());
                return null;
            }
            const data = await response.json();
            return data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri || null;
        }
        catch (err) {
            console.error('[GoogleOAuthService] Error creating meeting event:', err);
            return null;
        }
    }
    async getFreeBusy(userIds, companyId, timeMin, timeMax) {
        const result = {};
        for (const userId of userIds) {
            const tokens = await this.getTokensForUser(userId, companyId);
            if (!tokens || !tokens.calendar_email) {
                result[userId] = { connected: false, busy: [] };
                continue;
            }
            try {
                const accessToken = await this.ensureValidToken(tokens, userId, companyId);
                const body = {
                    timeMin: timeMin.toISOString(),
                    timeMax: timeMax.toISOString(),
                    items: [{ id: tokens.calendar_email }],
                };
                const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });
                if (!response.ok) {
                    result[userId] = { connected: true, busy: [] };
                    continue;
                }
                const data = await response.json();
                const busySlots = data.calendars?.[tokens.calendar_email]?.busy || [];
                result[userId] = { connected: true, busy: busySlots };
            }
            catch (err) {
                console.error(`[GoogleOAuthService] FreeBusy error for user ${userId}:`, err);
                result[userId] = { connected: true, busy: [] };
            }
        }
        return result;
    }
    async ensureValidToken(tokens, userId, companyId) {
        const now = Date.now();
        const isExpired = tokens.token_expiry && tokens.token_expiry < now + 60000;
        if (isExpired && tokens.refresh_token) {
            const refreshed = await this.refreshAccessToken(tokens.refresh_token);
            const newTokens = {
                ...tokens,
                access_token: refreshed.access_token,
                token_expiry: refreshed.expiry_date,
            };
            await prisma_1.prisma.integration.updateMany({
                where: {
                    company_id: companyId,
                    type: 'CALENDAR',
                    name: getUserIntegrationName(userId),
                },
                data: { config: newTokens },
            });
            return refreshed.access_token;
        }
        return tokens.access_token;
    }
    async exchangeCodeForTokens(code) {
        const params = new URLSearchParams({
            code,
            client_id: env_1.env.GOOGLE_CLIENT_ID,
            client_secret: env_1.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: env_1.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
        });
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token exchange failed: ${errorText}`);
        }
        const data = await response.json();
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expiry_date: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
        };
    }
    async refreshAccessToken(refreshToken) {
        const params = new URLSearchParams({
            refresh_token: refreshToken,
            client_id: env_1.env.GOOGLE_CLIENT_ID,
            client_secret: env_1.env.GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
        });
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });
        if (!response.ok) {
            throw new Error('Token refresh failed');
        }
        const data = await response.json();
        return {
            access_token: data.access_token,
            expiry_date: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
        };
    }
    async getGoogleEmail(accessToken) {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!response.ok)
                return undefined;
            const data = await response.json();
            return data.email;
        }
        catch {
            return undefined;
        }
    }
}
exports.GoogleOAuthService = GoogleOAuthService;
exports.googleOAuthService = new GoogleOAuthService();
