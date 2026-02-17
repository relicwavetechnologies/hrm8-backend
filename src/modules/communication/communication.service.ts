import { BaseService } from '../../core/service';
import { PrismaClient, EmailStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { HttpException } from '../../core/http-exception';
import { EmailTemplateAIService } from '../ai/email-template-ai.service';
import nodemailer from 'nodemailer';
import { env } from '../../config/env';

const prisma = new PrismaClient();
const prismaAny = prisma as any;

type CallOutcomeType = 'PICKED_UP' | 'BUSY' | 'NO_ANSWER' | 'LEFT_VOICEMAIL' | 'WRONG_NUMBER' | 'SCHEDULED_CALLBACK';
type SmsStatusType = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

export class CommunicationService extends BaseService {
  private transporter: nodemailer.Transporter;
  private emailService: EmailService;

  constructor() {
    super();
    this.emailService = new EmailService();

    // Initialize transporter with environment variables
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

  // ==================== LEGACY EMAIL METHODS ====================

  async sendEmailDirect(to: string, subject: string, html: string, text?: string) {
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

  async sendWelcomeEmail(to: string, name: string) {
    const subject = 'Welcome to HRM8';
    const html = `<h1>Welcome, ${name}!</h1><p>We are excited to have you on board.</p>`;
    return this.sendEmailDirect(to, subject, html);
  }

  async sendInvitationEmail(to: string, companyName: string, inviteLink: string) {
    const subject = `Invitation to join ${companyName} on HRM8`;
    const html = `
      <h1>You've been invited!</h1>
      <p>${companyName} has invited you to join their team on HRM8.</p>
      <p><a href="${inviteLink}">Click here to accept the invitation</a></p>
    `;
    return this.sendEmailDirect(to, subject, html);
  }

  // ==================== CALL LOGS ====================

  async logCall(data: {
    applicationId: string;
    userId: string;
    callDate: Date;
    outcome: CallOutcomeType;
    phoneNumber?: string;
    duration?: number;
    notes?: string;
  }) {
    // Verify application exists
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: { candidate: true }
    });

    if (!application) {
      throw new HttpException(404, 'Application not found');
    }

    return prismaAny.callLog.create({
      data: {
        application_id: data.applicationId,
        user_id: data.userId,
        call_date: data.callDate,
        outcome: data.outcome,
        phone_number: data.phoneNumber || application.candidate.phone,
        duration: data.duration,
        notes: data.notes,
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });
  }

  async getCallLogs(applicationId: string) {
    return prismaAny.callLog.findMany({
      where: { application_id: applicationId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { call_date: 'desc' }
    });
  }

  // ==================== EMAIL WITH LOGGING ====================

  async sendCandidateEmail(data: {
    applicationId: string;
    userId: string;
    subject: string;
    body: string;
    templateId?: string;
  }) {
    // Get application with candidate info
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: {
        candidate: true,
        job: { include: { company: true } }
      }
    });

    if (!application) {
      throw new HttpException(404, 'Application not found');
    }

    if (!application.candidate.email) {
      throw new HttpException(400, 'Candidate has no email address');
    }

    // Send the email
    try {
      await this.emailService.sendNotificationEmail(
        application.candidate.email,
        data.subject,
        data.body,
      );

      // Log the email
      return prismaAny.emailLog.create({
        data: {
          application_id: data.applicationId,
          user_id: data.userId,
          to_email: application.candidate.email,
          subject: data.subject,
          body: data.body,
          template_id: data.templateId,
          status: EmailStatus.SENT,
        },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });
    } catch (error) {
      // Log failed email attempt
      await prismaAny.emailLog.create({
        data: {
          application_id: data.applicationId,
          user_id: data.userId,
          to_email: application.candidate.email,
          subject: data.subject,
          body: data.body,
          template_id: data.templateId,
          status: EmailStatus.FAILED,
        }
      });
      throw new HttpException(500, 'Failed to send email');
    }
  }

  async getEmailLogs(applicationId: string) {
    return prismaAny.emailLog.findMany({
      where: { application_id: applicationId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        template: { select: { id: true, name: true, type: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getEmailTemplates(companyId: string) {
    return prisma.emailTemplate.findMany({
      where: {
        company_id: companyId,
        is_active: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        subject: true,
        body: true,
        variables: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async generateEmailWithAI(data: {
    applicationId: string;
    purpose: string;
    tone?: 'professional' | 'friendly' | 'formal';
  }) {
    // Get application context
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: {
        candidate: true,
        job: { include: { company: true } }
      }
    });

    if (!application) {
      throw new HttpException(404, 'Application not found');
    }

    try {
      // Use the existing EmailTemplateAIService which uses OpenAI
      const result = await EmailTemplateAIService.generateTemplate({
        type: data.purpose,
        jobTitle: application.job.title,
        companyName: application.job.company.name,
        candidateName: `${application.candidate.first_name} ${application.candidate.last_name}`,
        context: `Application Status: ${application.status}`,
        tone: data.tone || 'professional',
      });

      return result;
    } catch (error) {
      console.error('AI email generation error:', error);
      throw new HttpException(500, 'Failed to generate email with AI');
    }
  }

  // ==================== SMS ====================

  async sendSms(data: {
    applicationId: string;
    userId: string;
    message: string;
  }) {
    // Get application with candidate info
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: { candidate: true }
    });

    if (!application) {
      throw new HttpException(404, 'Application not found');
    }

    if (!application.candidate.phone) {
      throw new HttpException(400, 'Candidate has no phone number');
    }

    // Check if Twilio is configured
    const twilioConfigured = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;

    // Create log entry
    const smsLog = await prismaAny.smsLog.create({
      data: {
        application_id: data.applicationId,
        user_id: data.userId,
        to_number: application.candidate.phone,
        from_number: process.env.TWILIO_PHONE_NUMBER || null,
        message: data.message,
        status: (twilioConfigured ? 'PENDING' : 'FAILED') as SmsStatusType,
        error_message: twilioConfigured ? null : 'Twilio not configured. SMS will be logged but not sent.',
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    // If Twilio is configured, attempt to send
    if (twilioConfigured) {
      try {
        // Dynamic import of Twilio
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        const result = await client.messages.create({
          body: data.message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: application.candidate.phone
        });

        // Update status to SENT
        return prismaAny.smsLog.update({
          where: { id: smsLog.id },
          data: {
            status: 'SENT' as SmsStatusType,
            twilio_sid: result.sid
          },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        });
      } catch (error: any) {
        await prismaAny.smsLog.update({
          where: { id: smsLog.id },
          data: {
            status: 'FAILED' as SmsStatusType,
            error_message: error.message
          }
        });
        throw new HttpException(500, `Failed to send SMS: ${error.message}`);
      }
    }

    return smsLog;
  }

  async getSmsLogs(applicationId: string) {
    return prismaAny.smsLog.findMany({
      where: { application_id: applicationId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  // ==================== SLACK ====================

  async sendSlackMessage(data: {
    applicationId: string;
    userId: string;
    recipientIds: string[];
    message: string;
  }) {
    // Get application context for logging
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: {
        candidate: true,
        job: true
      }
    });

    if (!application) {
      throw new HttpException(404, 'Application not found');
    }

    // Log the Slack message
    const slackLog = await prismaAny.slackLog.create({
      data: {
        application_id: data.applicationId,
        user_id: data.userId,
        recipient_ids: data.recipientIds,
        message: data.message,
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    // If Slack is configured, send the message
    if (process.env.SLACK_BOT_TOKEN) {
      try {
        const { WebClient } = require('@slack/web-api');
        const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

        // Send DM to each recipient
        for (const recipientId of data.recipientIds) {
          try {
            // Open a conversation with the user
            const conversation = await slack.conversations.open({
              users: recipientId
            });

            if (conversation.channel?.id) {
              await slack.chat.postMessage({
                channel: conversation.channel.id,
                text: `📋 *Re: ${application.candidate.first_name} ${application.candidate.last_name}* (${application.job.title})\n\n${data.message}`,
                mrkdwn: true
              });
            }
          } catch (slackError) {
            console.error(`Failed to send Slack message to ${recipientId}:`, slackError);
          }
        }

        // Update log with success
        await prismaAny.slackLog.update({
          where: { id: slackLog.id },
          data: { channel_id: 'dm' }
        });
      } catch (error) {
        console.error('Slack integration error:', error);
        // Don't throw - we still logged the attempt
      }
    }

    return slackLog;
  }

  async getSlackLogs(applicationId: string) {
    return prismaAny.slackLog.findMany({
      where: { application_id: applicationId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getHiringTeamForSlack(jobId: string) {
    // Get hiring team members with their user info and team roles
    const hiringTeam = await prisma.jobHiringTeamMember.findMany({
      where: { job_id: jobId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        member_roles: {
          include: {
            job_role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return hiringTeam
      .filter((member) => member.user)
      .map((member) => ({
        id: member.user!.id,
        name: member.user!.name,
        email: member.user!.email,
        role: member.user!.role,
        hiringRole: member.member_roles?.[0]?.job_role?.name || 'Member',
      }));
  }
}

export const communicationService = new CommunicationService();
