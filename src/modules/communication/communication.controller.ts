import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CommunicationService } from './communication.service';
import { AuthenticatedRequest } from '../../types';
import { gmailService } from '../integration/gmail.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CommunicationController extends BaseController {
  private communicationService: CommunicationService;

  constructor() {
    super();
    this.communicationService = new CommunicationService();
  }

  // Test email endpoint for admin
  sendTestEmail = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        return this.sendError(res, new Error('Unauthorized'));
      }

      const { to } = req.body;
      // Use direct email sending for test
      return this.sendSuccess(res, { message: 'Test email endpoint - configure SMTP settings' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // ==================== GMAIL THREADS ====================

  getGmailThreads = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;

      // Get candidate email from application
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { candidate: { select: { email: true } } },
      });

      if (!application) {
        return this.sendError(res, new Error('Application not found'), 404);
      }

      const candidateEmail = application.candidate?.email;
      const emailLogs = await this.communicationService.getEmailLogs(applicationId);

      if (!candidateEmail) {
        return this.sendSuccess(res, { gmailThreads: [], emailLogs, gmailConnected: false });
      }

      try {
        const gmailThreads = await gmailService.getThreadsForCandidate(
          req.user.id,
          req.user.companyId,
          candidateEmail
        );
        return this.sendSuccess(res, { gmailThreads, emailLogs, gmailConnected: true });
      } catch (gmailError: any) {
        // Gmail not connected or API error — still return email logs
        console.error('[CommunicationController] Gmail error:', gmailError.message);
        return this.sendSuccess(res, { gmailThreads: [], emailLogs, gmailConnected: false });
      }
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // ==================== CALL LOGS ====================

  logCall = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;
      const { callDate, outcome, phoneNumber, duration, notes } = req.body;

      if (!callDate || !outcome) {
        return this.sendError(res, new Error('callDate and outcome are required'), 400);
      }

      const validOutcomes = ['PICKED_UP', 'BUSY', 'NO_ANSWER', 'LEFT_VOICEMAIL', 'WRONG_NUMBER', 'SCHEDULED_CALLBACK'];
      if (!validOutcomes.includes(outcome)) {
        return this.sendError(res, new Error(`Invalid outcome. Must be one of: ${validOutcomes.join(', ')}`), 400);
      }

      const callLog = await this.communicationService.logCall({
        applicationId,
        userId: req.user.id,
        callDate: new Date(callDate),
        outcome: outcome,
        phoneNumber,
        duration,
        notes,
      });

      return this.sendSuccess(res, { callLog });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCallLogs = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;
      const callLogs = await this.communicationService.getCallLogs(applicationId);

      return this.sendSuccess(res, { callLogs });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // ==================== EMAIL ====================

  sendEmail = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;
      const { subject, body, templateId } = req.body;

      if (!subject || !body) {
        return this.sendError(res, new Error('subject and body are required'), 400);
      }

      const result = await this.communicationService.sendCandidateEmail({
        applicationId,
        userId: req.user.id,
        subject,
        body,
        templateId,
      });

      return this.sendSuccess(res, {
        emailLog: result.emailLog,
        ...(result.needsReconnect && { needsReconnect: true })
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getEmailLogs = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;
      const emailLogs = await this.communicationService.getEmailLogs(applicationId);

      return this.sendSuccess(res, { emailLogs });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getEmailTemplates = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const templates = await this.communicationService.getEmailTemplates(req.user.companyId);

      return this.sendSuccess(res, { templates });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  generateEmailWithAI = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;
      const { purpose, tone } = req.body;

      if (!purpose) {
        return this.sendError(res, new Error('purpose is required'), 400);
      }

      const generatedEmail = await this.communicationService.generateEmailWithAI({
        applicationId,
        purpose,
        tone,
      });

      return this.sendSuccess(res, { email: generatedEmail });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // ==================== SMS ====================

  sendSms = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;
      const { message } = req.body;

      if (!message) {
        return this.sendError(res, new Error('message is required'), 400);
      }

      if (message.length > 1600) {
        return this.sendError(res, new Error('SMS message cannot exceed 1600 characters'), 400);
      }

      const smsLog = await this.communicationService.sendSms({
        applicationId,
        userId: req.user.id,
        message,
      });

      return this.sendSuccess(res, { smsLog });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getSmsLogs = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;
      const smsLogs = await this.communicationService.getSmsLogs(applicationId);

      return this.sendSuccess(res, { smsLogs });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // ==================== SLACK ====================

  sendSlackMessage = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;
      const { recipientIds, message } = req.body;

      if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
        return this.sendError(res, new Error('recipientIds array is required'), 400);
      }

      if (!message) {
        return this.sendError(res, new Error('message is required'), 400);
      }

      const slackLog = await this.communicationService.sendSlackMessage({
        applicationId,
        userId: req.user.id,
        recipientIds,
        message,
      });

      return this.sendSuccess(res, { slackLog });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getSlackLogs = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;
      const slackLogs = await this.communicationService.getSlackLogs(applicationId);

      return this.sendSuccess(res, { slackLogs });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getHiringTeamForSlack = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { jobId } = req.params;
      const team = await this.communicationService.getHiringTeamForSlack(jobId);

      return this.sendSuccess(res, { team });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // ==================== EMAIL THREAD REPLIES ====================

  replyEmail = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;
      const { threadId, messageId, subject, body, to } = req.body;

      if (!threadId || !messageId || !subject || !body || !to) {
        return this.sendError(
          res,
          new Error('threadId, messageId, subject, body, and to are required'),
          400
        );
      }

      const emailLog = await this.communicationService.replyToEmail({
        applicationId,
        userId: req.user.id,
        threadId,
        messageId,
        subject,
        body,
        to,
      });

      return this.sendSuccess(res, { emailLog });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  rewriteEmailReply = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { id: applicationId } = req.params;
      const { originalMessage, tone } = req.body;

      if (!originalMessage) {
        return this.sendError(res, new Error('originalMessage is required'), 400);
      }

      const rewritten = await this.communicationService.rewriteEmailReply({
        applicationId,
        originalMessage,
        tone,
      });

      return this.sendSuccess(res, rewritten);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
