import nodemailer from 'nodemailer';
import { BaseService } from '../../core/service';
import { env } from '../../config/env';
import { EmailTemplateService } from './email-template.service';
import { prisma } from '../../utils/prisma';
import { getNotificationEmailTemplate } from './templates/notification.templates';
import { getPasswordResetTemplate, getVerificationEmailTemplate, getInvitationEmailTemplate } from './templates/auth.templates';

interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  cid?: string;
}

export class EmailService extends BaseService {
  private transporter: nodemailer.Transporter;
  private readonly emailProvider: 'smtp' | 'resend';

  constructor() {
    super();
    this.emailProvider = (env.EMAIL_PROVIDER || 'smtp').toLowerCase() === 'resend' ? 'resend' : 'smtp';
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT || '587'),
      secure: env.SMTP_SECURE === 'true',
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  private async sendViaResend(
    to: string,
    subject: string,
    html: string,
    strict: boolean
  ): Promise<void> {
    const apiKey = env.RESEND_API_KEY;
    const fromAddress = env.RESEND_FROM || env.SMTP_FROM || env.SMTP_USER;

    if (!apiKey || !fromAddress) {
      const reason = `Resend is not configured. Missing ${!apiKey ? 'RESEND_API_KEY' : 'RESEND_FROM/SMTP_FROM'}.`;
      console.error('[EmailService.sendViaResend] Configuration error', { reason });
      if (strict) {
        throw new Error(reason);
      }
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const error = `Resend API error ${response.status}: ${body || response.statusText}`;
      console.error('[EmailService.sendViaResend] Failed', {
        to,
        subject,
        status: response.status,
        body: body.slice(0, 600),
      });
      if (strict) {
        throw new Error(error);
      }
      return;
    }

    console.log('[EmailService.sendViaResend] Success', { to, subject });
  }

  /**
   * Fetch full entity details to populate template variables
   */
  async populateVariables(ids: {
    candidateId?: string;
    jobId?: string;
    companyId?: string;
    interviewerId?: string;
  }): Promise<Record<string, any>> {
    const variables: Record<string, any> = {};

    if (ids.candidateId) {
      const candidate = await prisma.candidate.findUnique({
        where: { id: ids.candidateId },
        include: { work_experience: true, education: true }
      });
      if (candidate) {
        variables.candidate = {
          ...candidate,
          firstName: candidate.first_name,
          lastName: candidate.last_name,

          // Logic for current company/designation from work experience
          current_company: candidate.work_experience?.[0]?.company || '',
          current_designation: candidate.work_experience?.[0]?.role || ''
        };
      }
    }

    if (ids.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: ids.jobId },
        include: {
          job_category: true,
          assigned_consultant: true,
          company: true
        }
      });
      if (job) {
        variables.job = {
          ...job,
          type: job.employment_type, // Remap for template
          currency: job.salary_currency, // Remap for template
          hiringManager: job.assigned_consultant
        };
        // If companyId wasn't passed but job has it, use it
        if (!ids.companyId && job.company_id) {
          variables.company = job.company;
        }
      }
    }

    if (ids.companyId && !variables.company) {
      const company = await prisma.company.findUnique({
        where: { id: ids.companyId },
        include: { profile: true }
      });
      if (company) variables.company = company;
    }

    if (ids.interviewerId) {
      const interviewer = await prisma.user.findUnique({
        where: { id: ids.interviewerId }
      });
      if (interviewer) variables.interviewer = interviewer;
    }

    return variables;
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    attachments: EmailAttachment[] = [],
    options: { strict?: boolean } = {}
  ) {
    const strict = options.strict === true;
    const startedAt = Date.now();
    const smtpPort = parseInt(env.SMTP_PORT || '587');
    const smtpSecure = env.SMTP_SECURE === 'true';
    const fromAddress = env.SMTP_FROM || env.SMTP_USER;

    console.log('[EmailService.sendEmail] Attempt', {
      to,
      subject,
      strict,
      provider: this.emailProvider,
      smtpHost: env.SMTP_HOST || null,
      smtpPort,
      smtpSecure,
      fromAddress: fromAddress || null,
      hasSmtpUser: Boolean(env.SMTP_USER),
      hasSmtpPass: Boolean(env.SMTP_PASS),
      attachmentCount: attachments.length,
    });

    if (this.emailProvider === 'resend') {
      const resendStartedAt = Date.now();
      try {
        await this.sendViaResend(to, subject, html, strict);
        console.log('[EmailService.sendEmail] Resend duration', {
          to,
          subject,
          durationMs: Date.now() - resendStartedAt,
        });
      } catch (error) {
        console.error('[EmailService.sendEmail] Resend error', {
          to,
          subject,
          strict,
          durationMs: Date.now() - resendStartedAt,
          error: error instanceof Error ? error.message : String(error),
        });
        if (strict) {
          throw error instanceof Error ? error : new Error('Failed to send email via Resend');
        }
      }
      return;
    }

    if (!env.SMTP_HOST) {
      console.log(`[EmailService] SMTP not configured. Skipping email to ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body length: ${html.length}`);
      if (attachments.length) console.log(`Attachments: ${attachments.length} files`);
      if (strict) {
        throw new Error('SMTP is not configured. Unable to send email.');
      }
      return;
    }

    try {
      await this.transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        attachments,
      });
      console.log('[EmailService.sendEmail] Success', {
        to,
        subject,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      const errorCode = typeof error === 'object' && error && 'code' in error ? (error as any).code : undefined;
      const smtpCommand = typeof error === 'object' && error && 'command' in error ? (error as any).command : undefined;
      console.error('[EmailService.sendEmail] Failed', {
        to,
        subject,
        strict,
        durationMs: Date.now() - startedAt,
        code: errorCode,
        command: smtpCommand,
        error: error instanceof Error ? error.message : String(error),
      });
      if (strict) {
        throw error instanceof Error ? error : new Error('Failed to send email');
      }
    }
  }

  /**
   * Send an email using a stored template
   */
  async sendTemplateEmail(data: {
    to: string;
    templateId: string;
    variables?: Record<string, any>; // Manual overrides
    contextIds?: { // IDs to auto-fetch
      candidateId?: string;
      jobId?: string;
      companyId?: string;
      interviewerId?: string;
    };
    attachments?: EmailAttachment[];
  }) {
    const template = await EmailTemplateService.findOne(data.templateId);
    if (!template) {
      throw new Error(`Email template not found: ${data.templateId}`);
    }

    // Auto-populate variables from DB if IDs provided
    const dbVariables = data.contextIds ? await this.populateVariables(data.contextIds) : {};

    // Merge: Manual variables take precedence over DB variables
    const finalVariables = {
      ...dbVariables,
      ...(data.variables || {})
    };

    const { subject, body } = template;
    const interpolatedSubject = this.interpolateTemplate(subject, finalVariables);
    const interpolatedBody = this.interpolateTemplate(body, finalVariables);

    // Combine manual attachments with template-defined attachments (if any)
    const allAttachments = [...(data.attachments || [])];

    // If template has attachments metadata (e.g. stored URLs), fetch/attach them here
    // For now, assuming template.attachments is just metadata to be resolved or ignored if no binary content
    if (Array.isArray((template as any).attachments)) {
      // Example: template.attachments = [{ name: 'flyer.pdf', url: 'https://...' }]
      // We would need to fetch content or pass 'path' if it's a publicly accessible URL supported by nodemailer
      // For simplicity, we'll just log or implement basic 'path' support
      ((template as any).attachments as any[]).forEach(att => {
        if (att.url) {
          allAttachments.push({
            filename: att.name,
            path: att.url // Nodemailer supports URL as path
          });
        }
      });
    }

    await this.sendEmail(data.to, interpolatedSubject, interpolatedBody, allAttachments);
  }

  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
      // Handle nested keys like user.name
      const value = key.split('.').reduce((obj: any, k: string) => (obj || {})[k], variables);
      return value !== undefined ? value : match; // Keep {{variable}} if not found, or replace with empty string? Keeping match helps debugging.
    });
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

  async sendCandidateVerificationEmail(data: {
    to: string;
    name: string;
    verificationUrl: string;
    strict?: boolean;
  }) {
    const html = getVerificationEmailTemplate(data);
    await this.sendEmail(data.to, 'Verify Your Email', html, [], { strict: data.strict });
  }

  async sendNotificationEmail(to: string, title: string, message: string, actionUrl?: string) {
    const html = getNotificationEmailTemplate({ title, message, actionUrl });
    await this.sendEmail(to, title, html);
  }

  async sendInvitationEmail(data: { to: string; companyName: string; invitationUrl: string }) {
    const html = getInvitationEmailTemplate(data);
    await this.sendEmail(data.to, `Invitation to join ${data.companyName}`, html);
  }

  async sendJobAlertEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    jobUrl: string;
    companyName?: string;
    location?: string;
    employmentType?: string;
    workArrangement?: string;
    salaryRange?: string;
    jobDescription?: string;
    alertName?: string;
    matchScore?: number;
  }) {
    const message = `
      <p>Hi ${data.candidateName},</p>
      <p>A new job matching your alerts has been posted: <strong>${data.jobTitle}</strong>${data.companyName ? ` at <strong>${data.companyName}</strong>` : ''}.</p>
      ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
      ${data.employmentType ? `<p><strong>Type:</strong> ${data.employmentType}</p>` : ''}
      ${data.workArrangement ? `<p><strong>Arrangement:</strong> ${data.workArrangement}</p>` : ''}
      ${data.salaryRange ? `<p><strong>Salary:</strong> ${data.salaryRange}</p>` : ''}
      ${data.jobDescription ? `<p>${data.jobDescription}</p>` : ''}
      <p><a href="${data.jobUrl}">View Job</a></p>
    `;
    const html = getNotificationEmailTemplate({ title: 'New Job Alert', message, actionUrl: data.jobUrl });
    await this.sendEmail(data.to, `New Job Alert: ${data.jobTitle}`, html);
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
  async sendAssessmentInvitation(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    assessmentUrl: string;
    expiryDate?: Date;
  }) {
    const html = `
      <p>Hi ${data.candidateName},</p>
      <p>You have been invited to complete an assessment for the <strong>${data.jobTitle}</strong> position.</p>
      <p>Please complete the assessment by clicking the link below:</p>
      <p><a href="${data.assessmentUrl}">Start Assessment</a></p>
      <p style="font-size: 12px; color: #666;">Legacy URL: ${data.assessmentUrl}</p>
      ${data.expiryDate ? `<p>This link expires on ${data.expiryDate.toLocaleString()}</p>` : ''}
      <p>Good luck!</p>
    `;
    await this.sendEmail(data.to, `Assessment Invitation: ${data.jobTitle}`, html);
  }

  async sendHiringTeamInvitation(data: {
    to: string;
    inviterName: string;
    jobTitle: string;
    companyName: string;
    role: string;
    inviteLink: string;
  }) {
    const html = `
      <p>Hi,</p>
      <p>${data.inviterName} has invited you to join the hiring team for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong>.</p>
      <p>You have been assigned the role of <strong>${data.role}</strong>.</p>
      <p>To accept this invitation and set up your account, please click the link below:</p>
      <p><a href="${data.inviteLink}">Accept Invitation</a></p>
      <p>If you already have an account, you can simply log in.</p>
      <p>Best regards,<br/>The ${data.companyName} Team</p>
    `;
    await this.sendEmail(data.to, `Invitation to Hiring Team: ${data.jobTitle}`, html);
  }
}

export const emailService = new EmailService();
