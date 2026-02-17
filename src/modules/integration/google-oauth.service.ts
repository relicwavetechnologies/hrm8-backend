import { prisma } from '../../utils/prisma';
import { env } from '../../config/env';

interface CompanyTimezoneInfo {
  timezone: string;
  work_days: string[];
  start_time: string;
  end_time: string;
}

interface OAuth2Tokens {
  access_token: string;
  refresh_token?: string;
  token_expiry?: number;
  calendar_email?: string;
}

interface FreeBusyResult {
  [userId: string]: {
    connected: boolean;
    busy: Array<{ start: string; end: string }>;
  };
}

interface MeetingEventDetails {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: Array<{ email: string }>;
}

function getUserIntegrationName(userId: string): string {
  return `user-calendar-${userId}`;
}

export class GoogleOAuthService {
  async getCompanyTimezone(companyId: string): Promise<CompanyTimezoneInfo> {
    const settings = await prisma.companySettings.findUnique({
      where: { company_id: companyId },
    });
    return {
      timezone: settings?.timezone || 'UTC',
      work_days: settings?.work_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      start_time: settings?.start_time || '09:00',
      end_time: settings?.end_time || '17:00',
    };
  }

  getAuthUrl(userId: string, companyId: string): string {
    const clientId = env.GOOGLE_CLIENT_ID;
    const redirectUri = env.GOOGLE_REDIRECT_URI;
    const state = Buffer.from(JSON.stringify({ userId, companyId })).toString('base64');
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email'
    );

    return (
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`
    );
  }

  async handleCallback(code: string, userId: string, companyId: string): Promise<void> {
    const tokens = await this.exchangeCodeForTokens(code);
    const calendarEmail = await this.getGoogleEmail(tokens.access_token);

    const existingIntegration = await prisma.integration.findFirst({
      where: {
        company_id: companyId,
        type: 'CALENDAR',
        name: getUserIntegrationName(userId),
      },
    });

    const configData: OAuth2Tokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokens.expiry_date ?? undefined,
      calendar_email: calendarEmail,
    };

    if (existingIntegration) {
      await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          config: configData as any,
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.integration.create({
        data: {
          company_id: companyId,
          type: 'CALENDAR',
          name: getUserIntegrationName(userId),
          status: 'ACTIVE',
          config: configData as any,
        },
      });
    }
  }

  async getTokensForUser(userId: string, companyId: string): Promise<OAuth2Tokens | null> {
    const integration = await prisma.integration.findFirst({
      where: {
        company_id: companyId,
        type: 'CALENDAR',
        name: getUserIntegrationName(userId),
        status: 'ACTIVE',
      },
    });
    return (integration?.config as unknown as OAuth2Tokens) ?? null;
  }

  async isUserConnected(userId: string, companyId: string): Promise<{ connected: boolean; email?: string }> {
    const tokens = await this.getTokensForUser(userId, companyId);
    if (!tokens) return { connected: false };
    return { connected: true, email: tokens.calendar_email };
  }

  async createMeetingEvent(
    userId: string,
    companyId: string,
    details: MeetingEventDetails
  ): Promise<{ link: string | null; error?: string }> {
    const tokens = await this.getTokensForUser(userId, companyId);
    if (!tokens) {
      return { link: null, error: 'Google Calendar not connected. Please connect your calendar in Settings.' };
    }

    try {
      const accessToken = await this.ensureValidToken(tokens, userId, companyId);
      const { timezone } = await this.getCompanyTimezone(companyId);

      const eventBody = {
        summary: details.summary,
        description: details.description || '',
        start: { dateTime: details.start.toISOString(), timeZone: timezone },
        end: { dateTime: details.end.toISOString(), timeZone: timezone },
        attendees: details.attendees || [],
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GoogleOAuthService] Failed to create event:', errorText);
        return { link: null, error: `Google Calendar API error (${response.status}). Try reconnecting your calendar.` };
      }

      const data = await response.json() as any;
      const hangoutLink = data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri || null;
      if (!hangoutLink) {
        return { link: null, error: 'Google Calendar event created but no Meet link was generated.' };
      }
      return { link: hangoutLink };
    } catch (err: any) {
      console.error('[GoogleOAuthService] Error creating meeting event:', err);
      return { link: null, error: `Failed to create calendar event: ${err.message || 'Unknown error'}` };
    }
  }

  async getFreeBusy(
    userIds: string[],
    companyId: string,
    timeMin: Date,
    timeMax: Date,
    timezone?: string
  ): Promise<FreeBusyResult> {
    const result: FreeBusyResult = {};
    const tz = timezone || (await this.getCompanyTimezone(companyId)).timezone;

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
          timeZone: tz,
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

        const data = await response.json() as any;
        const busySlots = data.calendars?.[tokens.calendar_email]?.busy || [];
        result[userId] = { connected: true, busy: busySlots };
      } catch (err) {
        console.error(`[GoogleOAuthService] FreeBusy error for user ${userId}:`, err);
        result[userId] = { connected: true, busy: [] };
      }
    }

    return result;
  }

  private async ensureValidToken(tokens: OAuth2Tokens, userId: string, companyId: string): Promise<string> {
    const now = Date.now();
    const isExpired = tokens.token_expiry && tokens.token_expiry < now + 60000;

    if (isExpired && tokens.refresh_token) {
      const refreshed = await this.refreshAccessToken(tokens.refresh_token);
      const newTokens: OAuth2Tokens = {
        ...tokens,
        access_token: refreshed.access_token,
        token_expiry: refreshed.expiry_date,
      };
      await prisma.integration.updateMany({
        where: {
          company_id: companyId,
          type: 'CALENDAR',
          name: getUserIntegrationName(userId),
        },
        data: { config: newTokens as any },
      });
      return refreshed.access_token;
    }

    return tokens.access_token;
  }

  private async exchangeCodeForTokens(code: string): Promise<any> {
    const params = new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
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

    const data = await response.json() as any;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expiry_date: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };
  }

  private async refreshAccessToken(refreshToken: string): Promise<any> {
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
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

    const data = await response.json() as any;
    return {
      access_token: data.access_token,
      expiry_date: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };
  }

  private async getGoogleEmail(accessToken: string): Promise<string | undefined> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return undefined;
      const data = await response.json() as any;
      return data.email;
    } catch {
      return undefined;
    }
  }
}

export const googleOAuthService = new GoogleOAuthService();
