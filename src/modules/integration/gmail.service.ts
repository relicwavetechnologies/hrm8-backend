import { googleOAuthService } from './google-oauth.service';

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  isInbound: boolean;
}

export interface GmailThread {
  threadId: string;
  subject: string;
  snippet: string;
  lastMessageDate: string;
  messageCount: number;
  messages: GmailMessage[];
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function extractBody(payload: any): string {
  // Direct body on payload
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart - prefer text/html, fallback to text/plain
  if (payload.parts) {
    // Check for nested multipart
    for (const part of payload.parts) {
      if (part.mimeType === 'multipart/alternative' || part.mimeType === 'multipart/related') {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }

    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      return decodeBase64Url(htmlPart.body.data);
    }

    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data);
    }
  }

  return '';
}

export class GmailService {
  async getThreadsForCandidate(
    userId: string,
    companyId: string,
    candidateEmail: string
  ): Promise<GmailThread[]> {
    const tokens = await googleOAuthService.getTokensForUser(userId, companyId);
    if (!tokens) {
      throw new Error('Google account not connected');
    }

    const accessToken = await googleOAuthService.ensureValidToken(tokens, userId, companyId);
    const recruiterEmail = tokens.calendar_email || '';

    // Search for threads involving the candidate
    const query = encodeURIComponent(`from:${candidateEmail} OR to:${candidateEmail}`);
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${query}&maxResults=20`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('[GmailService] Failed to list threads:', errorText);
      throw new Error(`Gmail API error: ${listResponse.status}`);
    }

    const listData = (await listResponse.json()) as any;
    const threadIds: Array<{ id: string }> = listData.threads || [];

    if (threadIds.length === 0) {
      return [];
    }

    // Fetch full thread details in parallel
    const threads = await Promise.all(
      threadIds.map(async ({ id }) => {
        try {
          const threadResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?format=full`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (!threadResponse.ok) return null;

          const threadData = (await threadResponse.json()) as any;
          const messages: GmailMessage[] = (threadData.messages || []).map((msg: any) => {
            const headers = msg.payload?.headers || [];
            const from = getHeader(headers, 'From');
            const to = getHeader(headers, 'To');
            const subject = getHeader(headers, 'Subject');
            const date = getHeader(headers, 'Date');
            const body = extractBody(msg.payload);

            // Message is inbound if the From does NOT contain the recruiter's email
            const isInbound = recruiterEmail
              ? !from.toLowerCase().includes(recruiterEmail.toLowerCase())
              : false;

            return {
              id: msg.id,
              threadId: msg.threadId,
              from,
              to,
              subject,
              body,
              date,
              isInbound,
            };
          });

          // Filter 1: At least one message must have candidateEmail in From or To
          const hasCandidate = messages.some(msg =>
            msg.from.toLowerCase().includes(candidateEmail.toLowerCase()) ||
            msg.to.toLowerCase().includes(candidateEmail.toLowerCase())
          );
          if (!hasCandidate) return null;

          // Filter 2: At least one outbound message must be addressed to the candidate
          // (proves the recruiter actually emailed THIS person)
          const hasOutboundToCandidate = messages.some(msg =>
            !msg.isInbound &&
            msg.to.toLowerCase().includes(candidateEmail.toLowerCase())
          );
          if (!hasOutboundToCandidate) return null;

          const lastMessage = messages[messages.length - 1];
          return {
            threadId: id,
            subject: messages[0]?.subject || '(No Subject)',
            snippet: threadData.snippet || '',
            lastMessageDate: lastMessage?.date || '',
            messageCount: messages.length,
            messages,
          };
        } catch (err) {
          console.error(`[GmailService] Error fetching thread ${id}:`, err);
          return null;
        }
      })
    );

    return threads.filter((t): t is GmailThread => t !== null);
  }

  async sendEmail(
    userId: string,
    companyId: string,
    data: {
      to: string;
      subject: string;
      body: string;
      senderEmail: string;
    }
  ): Promise<{ success: boolean; messageId?: string; needsFallback?: boolean; error?: string }> {
    const tokens = await googleOAuthService.getTokensForUser(userId, companyId);
    if (!tokens) {
      throw new Error('Google account not connected');
    }

    const accessToken = await googleOAuthService.ensureValidToken(tokens, userId, companyId);

    try {
      // Build RFC 2822 raw message
      const rawMessage = [
        `From: ${data.senderEmail}`,
        `To: ${data.to}`,
        `Subject: ${data.subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset="UTF-8"`,
        ``,
        data.body,
      ].join('\r\n');

      const base64Message = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: base64Message,
        }),
      });

      if (response.ok) {
        const result = (await response.json()) as any;
        return { success: true, messageId: result.id };
      }

      if (response.status === 403) {
        console.log('[GmailService] Gmail API send scope not available, will use SMTP fallback');
        return { success: false, needsFallback: true, error: 'Insufficient scope for Gmail API send' };
      }

      const errorText = await response.text();
      console.error('[GmailService] Gmail API error:', errorText);
      throw new Error(`Gmail API error: ${response.status}`);
    } catch (error: any) {
      console.error('[GmailService] Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendReply(
    userId: string,
    companyId: string,
    data: {
      threadId: string;
      messageId: string;
      to: string;
      subject: string;
      body: string;
      senderEmail: string;
    }
  ): Promise<{ success: boolean; messageId?: string; needsFallback?: boolean; error?: string }> {
    const tokens = await googleOAuthService.getTokensForUser(userId, companyId);
    if (!tokens) {
      throw new Error('Google account not connected');
    }

    const accessToken = await googleOAuthService.ensureValidToken(tokens, userId, companyId);

    try {
      // Build RFC 2822 raw message
      const rawMessage = [
        `From: ${data.senderEmail}`,
        `To: ${data.to}`,
        `Subject: ${data.subject}`,
        `In-Reply-To: <${data.messageId}>`,
        `References: <${data.messageId}>`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset="UTF-8"`,
        ``,
        data.body,
      ].join('\r\n');

      const base64Message = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: base64Message,
          threadId: data.threadId,
        }),
      });

      if (response.ok) {
        const result = (await response.json()) as any;
        return { success: true, messageId: result.id };
      }

      if (response.status === 403) {
        console.log('[GmailService] Gmail API send scope not available, will use SMTP fallback');
        return { success: false, needsFallback: true, error: 'Insufficient scope for Gmail API send' };
      }

      const errorText = await response.text();
      console.error('[GmailService] Gmail API error:', errorText);
      throw new Error(`Gmail API error: ${response.status}`);
    } catch (error: any) {
      console.error('[GmailService] Error sending reply:', error);
      return { success: false, error: error.message };
    }
  }
}

export const gmailService = new GmailService();
