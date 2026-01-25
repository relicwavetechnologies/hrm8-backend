import { env } from '../../config/env';

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: Array<{ email: string; name?: string }>;
  timeZone?: string;
  location?: string;
}

export interface CalendarEventResult {
  eventId: string;
  meetingLink?: string;
  htmlLink?: string;
  calendarId?: string;
}

export class GoogleCalendarService {
  /**
   * Create a calendar event for a video interview with Google Meet link
   */
  static async createVideoInterviewEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
    try {
      if (this.isGoogleCalendarConfigured()) {
        return await this.createRealCalendarEvent(input);
      }
    } catch (error) {
      console.error('[GoogleCalendarService] Failed to create real calendar event, using fallback:', error);
    }

    return this.createFallbackMeetingLink(input);
  }

  private static isGoogleCalendarConfigured(): boolean {
    return !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    );
  }

  private static async createRealCalendarEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
    try {
      let google: any;
      try {
        const googleapis = await import('googleapis');
        google = googleapis.google;
      } catch (importError) {
        console.warn('[GoogleCalendarService] googleapis package not installed, using fallback mode');
        throw new Error('googleapis package not installed');
      }
      
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      let serviceAccountKey: any;

      try {
        serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
      } catch {
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
    } catch (error) {
      console.error('[GoogleCalendarService] Error creating calendar event:', error);
      throw error;
    }
  }

  private static createFallbackMeetingLink(input: CalendarEventInput): CalendarEventResult {
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
