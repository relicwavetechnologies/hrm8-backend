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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarService = void 0;
class GoogleCalendarService {
    /**
     * Create a calendar event for a video interview with Google Meet link
     */
    static async createVideoInterviewEvent(input) {
        try {
            if (this.isGoogleCalendarConfigured()) {
                return await this.createRealCalendarEvent(input);
            }
        }
        catch (error) {
            console.error('[GoogleCalendarService] Failed to create real calendar event, using fallback:', error);
        }
        return this.createFallbackMeetingLink(input);
    }
    static isGoogleCalendarConfigured() {
        return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    }
    static async createRealCalendarEvent(input) {
        try {
            let google;
            try {
                const googleapis = await Promise.resolve().then(() => __importStar(require('googleapis')));
                google = googleapis.google;
            }
            catch (importError) {
                console.warn('[GoogleCalendarService] googleapis package not installed, using fallback mode');
                throw new Error('googleapis package not installed');
            }
            const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
            const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
            let serviceAccountKey;
            try {
                serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
            }
            catch {
                serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
            }
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: serviceAccountEmail,
                    private_key: typeof serviceAccountKey === 'object' ? serviceAccountKey.private_key : serviceAccountKey,
                },
                scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
            });
            const calendar = google.calendar({ version: 'v3', auth });
            const event = {
                summary: input.summary,
                description: input.description || '',
                start: {
                    dateTime: input.start.toISOString(),
                    timeZone: input.timeZone || 'UTC',
                },
                end: {
                    dateTime: input.end.toISOString(),
                    timeZone: input.timeZone || 'UTC',
                },
                attendees: input.attendees?.map(a => ({ email: a.email })),
                location: input.location,
                conferenceData: {
                    createRequest: {
                        requestId: `interview-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        conferenceSolutionKey: {
                            type: 'hangoutsMeet',
                        },
                    },
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'popup', minutes: 15 },
                    ],
                },
            };
            const response = await calendar.events.insert({
                calendarId,
                conferenceDataVersion: 1,
                sendUpdates: input.attendees && input.attendees.length > 0 ? 'all' : 'none',
                requestBody: event,
            });
            const createdEvent = response.data;
            return {
                eventId: createdEvent.id || '',
                meetingLink: createdEvent.hangoutLink || createdEvent.conferenceData?.entryPoints?.[0]?.uri,
                htmlLink: createdEvent.htmlLink || undefined,
                calendarId,
            };
        }
        catch (error) {
            console.error('[GoogleCalendarService] Error creating calendar event:', error);
            throw error;
        }
    }
    static createFallbackMeetingLink(input) {
        const fakeEventId = `fallback-event-${Date.now()}`;
        const baseLink = process.env.GOOGLE_CALENDAR_MEETING_BASE_URL || 'https://meet.google.com';
        const generateMeetingCode = () => {
            const chars = 'abcdefghijklmnopqrstuvwxyz';
            const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            return `${part1}-${part2}-${part3}`;
        };
        const meetingCode = generateMeetingCode();
        const meetingLink = `${baseLink}/${meetingCode}`;
        console.log('[GoogleCalendarService] (fallback) Generated meeting link', {
            summary: input.summary,
            start: input.start.toISOString(),
            meetingLink,
        });
        return {
            eventId: fakeEventId,
            meetingLink,
            htmlLink: meetingLink,
        };
    }
}
exports.GoogleCalendarService = GoogleCalendarService;
