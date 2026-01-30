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

  async sendCompanyVerificationEmail(data: { to: string; companyName: string; verificationUrl: string }) {
    const html = `
      <p>Hi,</p>
      <p>Thank you for registering <strong>${data.companyName}</strong>.</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${data.verificationUrl}">Verify Email Address</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't register this company, please ignore this email.</p>
    `;
    await this.sendEmail(data.to, 'Verify Your Company Registration', html);
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

  // Application Emails
  async sendApplicationSubmissionEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    applicationUrl: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Application Received! 🎉</h2>
        <p>Hi ${data.candidateName},</p>
        <p>Thank you for applying for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong>. We've successfully received your application.</p>
        <p>Our team will review your profile and get back to you if there's a match. You can track your application status anytime via your dashboard:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.applicationUrl}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Application Status</a>
        </div>
        <p>Best of luck!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 0.875rem;">This is an automated message from the HRM8 Recruitment Platform.</p>
      </div>
    `;
    await this.sendEmail(data.to, `Application Submitted: ${data.jobTitle}`, html);
  }

  // Messaging Emails
  async sendNewMessageNotificationEmail(data: {
    to: string;
    recipientName: string;
    senderName: string;
    messageContent: string;
    conversationUrl: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">New Message Received</h2>
        <p>Hi ${data.recipientName},</p>
        <p>You have received a new message from <strong>${data.senderName}</strong>:</p>
        <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; font-style: italic;">
          "${data.messageContent}"
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.conversationUrl}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reply to Message</a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 0.875rem;">This is an automated message from HRM8. You can manage your notification settings in your profile.</p>
      </div>
    `;
    await this.sendEmail(data.to, `New Message from ${data.senderName}`, html);
  }

  // Generic Notification Email
  async sendNotificationEmail(to: string, title: string, message: string, actionUrl?: string) {
    const baseUrl = env.FRONTEND_URL || 'http://localhost:3000';
    const fullUrl = actionUrl ? (actionUrl.startsWith('http') ? actionUrl : `${baseUrl}${actionUrl}`) : baseUrl;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">${title}</h2>
        <p>${message}</p>
        ${actionUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${fullUrl}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Details</a>
        </div>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 0.875rem;">The HRM8 Team</p>
      </div>
    `;
    await this.sendEmail(to, title, html);
  }

  // Assessment Emails
  async sendAssessmentInvitationEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    assessmentUrl: string;
    expiryDate?: Date;
    deadlineDays?: number;
  }) {
    const html = `
      <p>Hi ${data.candidateName},</p>
      <p>You have been invited to complete an assessment for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong>.</p>
      <p>Please click the link below to start your assessment:</p>
      <p><a href="${data.assessmentUrl}">${data.assessmentUrl}</a></p>
      ${data.deadlineDays ? `<p>You have ${data.deadlineDays} days to complete this assessment.</p>` : ''}
      ${data.expiryDate ? `<p>This link expires on ${data.expiryDate.toLocaleDateString()}.</p>` : ''}
      <p>Best of luck!</p>
    `;
    await this.sendEmail(data.to, `Assessment Invitation: ${data.jobTitle}`, html);
  }

  async sendAssessmentCompletionEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    completedAt: Date;
  }) {
    const html = `
      <p>Hi ${data.candidateName},</p>
      <p>Thank you for completing the assessment for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong>.</p>
      <p>We will review your responses and get back to you soon.</p>
      <p>Completed on: ${data.completedAt.toLocaleString()}</p>
    `;
    await this.sendEmail(data.to, `Assessment Completed: ${data.jobTitle}`, html);
  }

  async sendAssessmentResultsNotification(data: {
    to: string;
    recruiterName: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    assessmentScore: number;
    passThreshold?: number;
    passed?: boolean;
    assessmentUrl: string;
    candidateProfileUrl: string;
  }) {
    const html = `
      <p>Hi ${data.recruiterName},</p>
      <p><strong>${data.candidateName}</strong> has completed the assessment for <strong>${data.jobTitle}</strong>.</p>
      <p><strong>Score:</strong> ${data.assessmentScore}% ${data.passThreshold ? `(Pass Threshold: ${data.passThreshold}%)` : ''}</p>
      ${data.passed !== undefined ? `<p><strong>Result:</strong> ${data.passed ? 'PASSED' : 'FAILED'}</p>` : ''}
      <p>View Results: <a href="${data.assessmentUrl}">${data.assessmentUrl}</a></p>
      <p>Candidate Profile: <a href="${data.candidateProfileUrl}">${data.candidateProfileUrl}</a></p>
    `;
    await this.sendEmail(data.to, `Assessment Completed: ${data.candidateName} - ${data.jobTitle}`, html);
  }
  async sendJobAlertEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    location: string;
    employmentType: string;
    workArrangement: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency: string;
    jobUrl: string;
  }) {
    const salaryText = data.salaryMin && data.salaryMax
      ? `<p><strong>Salary:</strong> ${data.salaryCurrency} ${data.salaryMin} - ${data.salaryMax}</p>`
      : '';

    const html = `
      <p>Hi ${data.candidateName},</p>
      <p>We found a new job that matches your criteria!</p>
      <div style="padding: 15px; border: 1px solid #eee; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${data.jobTitle}</h3>
        <p><strong>Company:</strong> ${data.companyName}</p>
        <p><strong>Location:</strong> ${data.location} (${data.workArrangement})</p>
        <p><strong>Type:</strong> ${data.employmentType}</p>
        ${salaryText}
        <p style="margin-bottom: 0;"><a href="${data.jobUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Job Details</a></p>
      </div>
      <p>Best regards,<br/>The HRM8 Team</p>
    `;
    await this.sendEmail(data.to, `Job Alert: ${data.jobTitle} at ${data.companyName}`, html);
  }
}

export const emailService = new EmailService();
