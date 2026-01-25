import nodemailer from 'nodemailer';
import { BaseService } from '../../core/service';
import { env } from '../../config/env';

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
      console.log(`Body: ${html}`);
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
    const html = `
      <p>Hi ${data.name},</p>
      <p>Please click <a href="${data.resetUrl}">here</a> to reset your password.</p>
      ${data.expiresAt ? `<p>This link expires at ${data.expiresAt.toLocaleString()}</p>` : ''}
    `;
    await this.sendEmail(data.to, 'Password Reset Request', html);
  }

  async sendPasswordChangeConfirmation(data: { to: string; name: string; changedAt?: Date }) {
    const html = `<p>Hi ${data.name},</p><p>Your password has been changed successfully.</p>`;
    await this.sendEmail(data.to, 'Password Changed', html);
  }

  async sendCandidateVerificationEmail(data: { to: string; name: string; verificationUrl: string }) {
    const html = `<p>Hi ${data.name},</p><p>Please verify your email by clicking <a href="${data.verificationUrl}">here</a>.</p>`;
    await this.sendEmail(data.to, 'Verify your email', html);
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
    const html = `
      <p>Hi ${data.candidateName},</p>
      <p>You have been invited to a ${data.interviewType} interview for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong>.</p>
      <p><strong>Date:</strong> ${data.scheduledDate.toLocaleString()}</p>
      ${data.meetingLink ? `<p><strong>Link:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a></p>` : ''}
      <p>Good luck!</p>
    `;
    await this.sendEmail(data.to, `Interview Invitation: ${data.jobTitle}`, html);
  }

  async sendInterviewRescheduledEmail(data: any) {
    const html = `<p>Hi ${data.candidateName},</p><p>Your interview for ${data.jobTitle} has been rescheduled to ${data.newDate.toLocaleString()}.</p>`;
    await this.sendEmail(data.to, `Interview Rescheduled: ${data.jobTitle}`, html);
  }

  async sendInterviewCancelledEmail(data: any) {
    const html = `<p>Hi ${data.candidateName},</p><p>Your interview for ${data.jobTitle} has been cancelled.</p><p>Reason: ${data.reason}</p>`;
    await this.sendEmail(data.to, `Interview Cancelled: ${data.jobTitle}`, html);
  }

  async sendInterviewNoShowEmail(data: any) {
    const html = `<p>Hi ${data.candidateName},</p><p>We missed you at the scheduled interview for ${data.jobTitle}.</p>`;
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
    [key: string]: any; // Allow other props
  }) {
    const html = `
      <p>Dear ${data.candidateName},</p>
      <p>We are pleased to offer you the position of <strong>${data.jobTitle}</strong>${data.companyName ? ` at <strong>${data.companyName}</strong>` : ''}.</p>
      <p>Please view your offer details and sign the document here: <a href="${data.offerUrl}">${data.offerUrl}</a></p>
      ${data.expiryDate ? `<p>This offer expires on: ${new Date(data.expiryDate).toLocaleDateString()}</p>` : ''}
      <p>Congratulations!</p>
    `;
    await this.sendEmail(data.to, `Job Offer: ${data.jobTitle}`, html);
  }

  async sendOfferAcceptedEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    startDate: Date;
  }) {
    const html = `
      <p>Hi ${data.candidateName},</p>
      <p>Thank you for accepting our offer for <strong>${data.jobTitle}</strong>!</p>
      <p>We look forward to having you start on ${new Date(data.startDate).toLocaleDateString()}.</p>
      <p>Welcome to the team!</p>
    `;
    await this.sendEmail(data.to, `Offer Accepted: ${data.jobTitle}`, html);
  }
}

export const emailService = new EmailService();
