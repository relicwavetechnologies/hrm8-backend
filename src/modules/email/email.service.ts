import nodemailer from 'nodemailer';
import { BaseService } from '../../core/service';
import { env } from '../../config/env';
import { getVerificationEmailTemplate, getPasswordResetTemplate, getInvitationEmailTemplate } from './templates/auth.templates';
import { getNotificationEmailTemplate } from './templates/notification.templates';

export class EmailService extends BaseService {
  private transporter: nodemailer.Transporter;

  constructor() {
    super();
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT),
      secure: env.SMTP_SECURE === 'true',
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (!env.SMTP_HOST) {
      console.log(`[EmailService] SMTP not configured. Skipping email to ${to}`);
      console.log(`Subject: ${subject}`);
      // Truncate long HTML in logs
      console.log(`Body: ${html.substring(0, 200)}...`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to,
        subject,
        html,
      });
      console.log(`[EmailService] Email sent to ${to}`);
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      // Don't throw, just log
    }
  }

  async sendPasswordResetEmail(data: { to: string; name: string; resetUrl: string; expiresAt?: Date }) {
    const html = getPasswordResetTemplate(data);
    await this.sendEmail(data.to, 'Reset Your Password', html);
  }

  async sendPasswordChangeConfirmation(data: { to: string; name: string; changedAt?: Date }) {
    const fullHtml = getNotificationEmailTemplate({
      title: 'Password Changed',
      message: `Your password was successfully changed on ${data.changedAt?.toLocaleString() || new Date().toLocaleString()}. If you did not make this change, please contact support immediately.`
    });

    await this.sendEmail(data.to, 'Password Changed', fullHtml);
  }

  async sendCandidateVerificationEmail(data: { to: string; name: string; verificationUrl: string }) {
    const html = getVerificationEmailTemplate(data);
    await this.sendEmail(data.to, 'Verify Your Email', html);
  }

  async sendNotificationEmail(to: string, title: string, message: string, actionUrl?: string) {
    const html = getNotificationEmailTemplate({ title, message, actionUrl });
    await this.sendEmail(to, title, html);
  }

  async sendInvitationEmail(data: { to: string; companyName: string; invitationUrl: string }) {
    const html = getInvitationEmailTemplate(data);
    await this.sendEmail(data.to, `Invitation to join ${data.companyName}`, html);
  }

  // Interview Emails
  async sendInterviewInvitation(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    scheduledDate: Date;
    meetingLink?: string;
    interviewType: string;
  }) {
    const message = `
      <p>Hi ${data.candidateName},</p>
      <p>You have been invited to a ${data.interviewType} interview for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong>.</p>
      <p><strong>Date:</strong> ${data.scheduledDate.toLocaleString()}</p>
      ${data.meetingLink ? `<p><strong>Link:</strong> <a href="${data.meetingLink}">Join Meeting</a></p>` : ''}
      <p>Good luck!</p>
    `;
    // Reuse specific branding via generic notification wrapper
    const html = getNotificationEmailTemplate({ title: `Interview Invitation: ${data.jobTitle}`, message, actionUrl: data.meetingLink });
    await this.sendEmail(data.to, `Interview Invitation: ${data.jobTitle}`, html);
  }

  async sendInterviewRescheduledEmail(data: any) {
    const message = `<p>Hi ${data.candidateName},</p><p>Your interview for ${data.jobTitle} has been rescheduled to ${data.newDate.toLocaleString()}.</p>`;
    const html = getNotificationEmailTemplate({ title: 'Interview Rescheduled', message });
    await this.sendEmail(data.to, `Interview Rescheduled: ${data.jobTitle}`, html);
  }

  async sendInterviewCancelledEmail(data: any) {
    const message = `<p>Hi ${data.candidateName},</p><p>Your interview for ${data.jobTitle} has been cancelled.</p><p>Reason: ${data.reason}</p>`;
    const html = getNotificationEmailTemplate({ title: 'Interview Cancelled', message });
    await this.sendEmail(data.to, `Interview Cancelled: ${data.jobTitle}`, html);
  }

  async sendInterviewNoShowEmail(data: any) {
    const message = `<p>Hi ${data.candidateName},</p><p>We missed you at the scheduled interview for ${data.jobTitle}.</p>`;
    const html = getNotificationEmailTemplate({ title: 'Interview Missed', message });
    await this.sendEmail(data.to, `Interview No-Show: ${data.jobTitle}`, html);
  }

  // Offer Emails
  async sendOfferEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    offerUrl: string;
    companyName?: string;
    expiryDate?: Date;
    [key: string]: any;
  }) {
    const message = `
      <p>Dear ${data.candidateName},</p>
      <p>We are pleased to offer you the position of <strong>${data.jobTitle}</strong>${data.companyName ? ` at <strong>${data.companyName}</strong>` : ''}.</p>
      ${data.expiryDate ? `<p>This offer expires on: ${new Date(data.expiryDate).toLocaleDateString()}</p>` : ''}
      <p>Congratulations!</p>
    `;
    const html = getNotificationEmailTemplate({ title: 'Job Offer', message, actionUrl: data.offerUrl });
    await this.sendEmail(data.to, `Job Offer: ${data.jobTitle}`, html);
  }

  async sendOfferAcceptedEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    startDate: Date;
  }) {
    const message = `
      <p>Hi ${data.candidateName},</p>
      <p>Thank you for accepting our offer for <strong>${data.jobTitle}</strong>!</p>
      <p>We look forward to having you start on ${new Date(data.startDate).toLocaleDateString()}.</p>
      <p>Welcome to the team!</p>
    `;
    const html = getNotificationEmailTemplate({ title: 'Offer Accepted', message });
    await this.sendEmail(data.to, `Offer Accepted: ${data.jobTitle}`, html);
  }

  // Job Alert Email
  async sendJobAlertEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    location: string;
    employmentType?: string;
    workArrangement?: string;
    salaryRange?: string;
    jobDescription?: string;
    jobUrl: string;
    alertName: string;
    matchScore: number;
  }) {
    const message = `
      <p>Hi ${data.candidateName},</p>
      <p>We found a new job that matches your "<strong>${data.alertName}</strong>" alert!</p>
      <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #111827;">${data.jobTitle}</h3>
        <p style="color: #6b7280; margin-bottom: 10px;">${data.companyName} • ${data.location}</p>
        ${data.employmentType ? `<p><strong>Employment Type:</strong> ${data.employmentType}</p>` : ''}
        ${data.workArrangement ? `<p><strong>Work Arrangement:</strong> ${data.workArrangement}</p>` : ''}
        ${data.salaryRange ? `<p><strong>Salary:</strong> ${data.salaryRange}</p>` : ''}
        ${data.jobDescription ? `<p style="margin-top: 15px;">${data.jobDescription}</p>` : ''}
      </div>
      <p style="text-align: center;">
        <a href="${data.jobUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View Job & Apply</a>
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
        Match Score: ${data.matchScore}%<br>
        You're receiving this because you have a job alert set up. 
        <a href="${data.jobUrl.replace('/jobs/', '/settings/alerts')}">Manage your alerts</a>
      </p>
    `;
    const html = getNotificationEmailTemplate({
      title: `New Job Match: ${data.jobTitle}`,
      message,
      actionUrl: data.jobUrl
    });
    await this.sendEmail(data.to, `New Job Match: ${data.jobTitle} at ${data.companyName}`, html);
  }
}

export const emailService = new EmailService();
