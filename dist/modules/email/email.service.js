"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const service_1 = require("../../core/service");
const env_1 = require("../../config/env");
const email_template_service_1 = require("./email-template.service");
const prisma_1 = require("../../utils/prisma");
const notification_templates_1 = require("./templates/notification.templates");
const auth_templates_1 = require("./templates/auth.templates");
class EmailService extends service_1.BaseService {
    constructor() {
        super();
        this.transporter = nodemailer_1.default.createTransport({
            host: env_1.env.SMTP_HOST,
            port: parseInt(env_1.env.SMTP_PORT || '587'),
            secure: env_1.env.SMTP_SECURE === 'true',
            auth: {
                user: env_1.env.SMTP_USER,
                pass: env_1.env.SMTP_PASS,
            },
        });
    }
    /**
     * Fetch full entity details to populate template variables
     */
    async populateVariables(ids) {
        const variables = {};
        if (ids.candidateId) {
            const candidate = await prisma_1.prisma.candidate.findUnique({
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
            const job = await prisma_1.prisma.job.findUnique({
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
            const company = await prisma_1.prisma.company.findUnique({
                where: { id: ids.companyId },
                include: { profile: true }
            });
            if (company)
                variables.company = company;
        }
        if (ids.interviewerId) {
            const interviewer = await prisma_1.prisma.user.findUnique({
                where: { id: ids.interviewerId }
            });
            if (interviewer)
                variables.interviewer = interviewer;
        }
        return variables;
    }
    async sendEmail(to, subject, html, attachments = []) {
        if (!env_1.env.SMTP_HOST) {
            console.log(`[EmailService] SMTP not configured. Skipping email to ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body: ${html}`);
            if (attachments.length)
                console.log(`Attachments: ${attachments.length} files`);
            return;
        }
        try {
            await this.transporter.sendMail({
                from: env_1.env.SMTP_FROM || env_1.env.SMTP_USER,
                to,
                subject,
                html,
                attachments,
            });
            console.log(`[EmailService] Email sent to ${to}`);
        }
        catch (error) {
            console.error('[EmailService] Failed to send email:', error);
            // Don't throw, just log
        }
    }
    /**
     * Send an email using a stored template
     */
    async sendTemplateEmail(data) {
        const template = await email_template_service_1.EmailTemplateService.findOne(data.templateId);
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
        if (Array.isArray(template.attachments)) {
            // Example: template.attachments = [{ name: 'flyer.pdf', url: 'https://...' }]
            // We would need to fetch content or pass 'path' if it's a publicly accessible URL supported by nodemailer
            // For simplicity, we'll just log or implement basic 'path' support
            template.attachments.forEach(att => {
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
    interpolateTemplate(template, variables) {
        return template.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
            // Handle nested keys like user.name
            const value = key.split('.').reduce((obj, k) => (obj || {})[k], variables);
            return value !== undefined ? value : match; // Keep {{variable}} if not found, or replace with empty string? Keeping match helps debugging.
        });
    }
    async sendPasswordResetEmail(data) {
        const html = (0, auth_templates_1.getPasswordResetTemplate)(data);
        await this.sendEmail(data.to, 'Reset Your Password', html);
    }
    async sendPasswordChangeConfirmation(data) {
        const fullHtml = (0, notification_templates_1.getNotificationEmailTemplate)({
            title: 'Password Changed',
            message: `Your password was successfully changed on ${data.changedAt?.toLocaleString() || new Date().toLocaleString()}. If you did not make this change, please contact support immediately.`
        });
        await this.sendEmail(data.to, 'Password Changed', fullHtml);
    }
    async sendCandidateVerificationEmail(data) {
        const html = (0, auth_templates_1.getVerificationEmailTemplate)(data);
        await this.sendEmail(data.to, 'Verify Your Email', html);
    }
    async sendNotificationEmail(to, title, message, actionUrl) {
        const html = (0, notification_templates_1.getNotificationEmailTemplate)({ title, message, actionUrl });
        await this.sendEmail(to, title, html);
    }
    async sendInvitationEmail(data) {
        const html = (0, auth_templates_1.getInvitationEmailTemplate)(data);
        await this.sendEmail(data.to, `Invitation to join ${data.companyName}`, html);
    }
    async sendJobAlertEmail(data) {
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
        const html = (0, notification_templates_1.getNotificationEmailTemplate)({ title: 'New Job Alert', message, actionUrl: data.jobUrl });
        await this.sendEmail(data.to, `New Job Alert: ${data.jobTitle}`, html);
    }
    // Interview Emails
    async sendInterviewInvitation(data) {
        const message = `
      <p>Hi ${data.candidateName},</p>
      <p>You have been invited to a ${data.interviewType} interview for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong>.</p>
      <p><strong>Date:</strong> ${data.scheduledDate.toLocaleString()}</p>
      ${data.meetingLink ? `<p><strong>Link:</strong> <a href="${data.meetingLink}">Join Meeting</a></p>` : ''}
      <p>Good luck!</p>
    `;
        // Reuse specific branding via generic notification wrapper
        const html = (0, notification_templates_1.getNotificationEmailTemplate)({ title: `Interview Invitation: ${data.jobTitle}`, message, actionUrl: data.meetingLink });
        await this.sendEmail(data.to, `Interview Invitation: ${data.jobTitle}`, html);
    }
    async sendInterviewRescheduledEmail(data) {
        const message = `<p>Hi ${data.candidateName},</p><p>Your interview for ${data.jobTitle} has been rescheduled to ${data.newDate.toLocaleString()}.</p>`;
        const html = (0, notification_templates_1.getNotificationEmailTemplate)({ title: 'Interview Rescheduled', message });
        await this.sendEmail(data.to, `Interview Rescheduled: ${data.jobTitle}`, html);
    }
    async sendInterviewCancelledEmail(data) {
        const message = `<p>Hi ${data.candidateName},</p><p>Your interview for ${data.jobTitle} has been cancelled.</p><p>Reason: ${data.reason}</p>`;
        const html = (0, notification_templates_1.getNotificationEmailTemplate)({ title: 'Interview Cancelled', message });
        await this.sendEmail(data.to, `Interview Cancelled: ${data.jobTitle}`, html);
    }
    async sendInterviewNoShowEmail(data) {
        const message = `<p>Hi ${data.candidateName},</p><p>We missed you at the scheduled interview for ${data.jobTitle}.</p>`;
        const html = (0, notification_templates_1.getNotificationEmailTemplate)({ title: 'Interview Missed', message });
        await this.sendEmail(data.to, `Interview No-Show: ${data.jobTitle}`, html);
    }
    // Offer Emails
    async sendOfferEmail(data) {
        const message = `
      <p>Dear ${data.candidateName},</p>
      <p>We are pleased to offer you the position of <strong>${data.jobTitle}</strong>${data.companyName ? ` at <strong>${data.companyName}</strong>` : ''}.</p>
      ${data.expiryDate ? `<p>This offer expires on: ${new Date(data.expiryDate).toLocaleDateString()}</p>` : ''}
      <p>Congratulations!</p>
    `;
        const html = (0, notification_templates_1.getNotificationEmailTemplate)({ title: 'Job Offer', message, actionUrl: data.offerUrl });
        await this.sendEmail(data.to, `Job Offer: ${data.jobTitle}`, html);
    }
    async sendOfferAcceptedEmail(data) {
        const message = `
      <p>Hi ${data.candidateName},</p>
      <p>Thank you for accepting our offer for <strong>${data.jobTitle}</strong>!</p>
      <p>We look forward to having you start on ${new Date(data.startDate).toLocaleDateString()}.</p>
      <p>Welcome to the team!</p>
    `;
        const html = (0, notification_templates_1.getNotificationEmailTemplate)({ title: 'Offer Accepted', message });
        await this.sendEmail(data.to, `Offer Accepted: ${data.jobTitle}`, html);
    }
    async sendAssessmentInvitation(data) {
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
    async sendHiringTeamInvitation(data) {
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
exports.EmailService = EmailService;
exports.emailService = new EmailService();
