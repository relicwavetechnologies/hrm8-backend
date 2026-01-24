import { BaseService } from '../../core/service';
import nodemailer from 'nodemailer';
import { env } from '../../config/env';

export class CommunicationService extends BaseService {
  private transporter: nodemailer.Transporter;

  constructor() {
    super();
    // Initialize transporter with environment variables
    // For now, using a placeholder or mock configuration if env vars are missing
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(env.SMTP_PORT || '587'),
      secure: env.SMTP_SECURE === 'true',
      auth: {
        user: env.SMTP_USER || 'user',
        pass: env.SMTP_PASS || 'pass',
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: env.SMTP_FROM || '"HRM8" <noreply@hrm8.io>',
        to,
        subject,
        text,
        html,
      });
      console.log(`Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }
  }

  // Template methods
  async sendWelcomeEmail(to: string, name: string) {
    const subject = 'Welcome to HRM8';
    const html = `<h1>Welcome, ${name}!</h1><p>We are excited to have you on board.</p>`;
    return this.sendEmail(to, subject, html);
  }

  async sendInvitationEmail(to: string, companyName: string, inviteLink: string) {
    const subject = `Invitation to join ${companyName} on HRM8`;
    const html = `
      <h1>You've been invited!</h1>
      <p>${companyName} has invited you to join their team on HRM8.</p>
      <p><a href="${inviteLink}">Click here to accept the invitation</a></p>
    `;
    return this.sendEmail(to, subject, html);
  }
}

export const communicationService = new CommunicationService();
