import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { EmailService } from './emails.service';
import { EmailRepository } from './emails.repository';
import { AuthenticatedRequest } from '../../types';
import { SendEmailRequest } from './emails.types';

export class EmailController extends BaseController {
    private service: EmailService;

    constructor() {
        super('emails');
        this.service = new EmailService(new EmailRepository());
    }

    /**
     * Send email
     * POST /api/emails/send
     */
    sendEmail = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const data: SendEmailRequest = req.body;
            const email = await this.service.sendEmail(data, req.user);
            return this.sendSuccess(res, email, 'Email sent successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get sent emails
     * GET /api/emails/sent
     */
    getSent = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const emails = await this.service.getSentEmails(req.user.id);
            return this.sendSuccess(res, emails);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get inbox
     * GET /api/emails/inbox
     */
    getInbox = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const emails = await this.service.getInbox(req.user.email);
            return this.sendSuccess(res, emails);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get email details
     * GET /api/emails/:id
     */
    getEmail = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const email = await this.service.getEmail(id, req.user.id);
            return this.sendSuccess(res, email);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
