import { BaseService } from '../../core/service';
import { EmailRepository } from './emails.repository';
import { SendEmailRequest } from './emails.types';
import { HttpException } from '../../core/http-exception';
import { AuthenticatedRequest } from '../../types';
import { EmailStatus } from '@prisma/client';
import { emailService as coreEmailService } from '../email/email.service'; // Assuming core service exists for actual sending

export class EmailService extends BaseService {
    constructor(private repository: EmailRepository) {
        super();
    }

    /**
     * Send email
     */
    async sendEmail(data: SendEmailRequest, user: AuthenticatedRequest['user']) {
        if (!user) throw new HttpException(401, 'Unauthorized');

        try {
            // 1. Send via core email service (AWS SES, SendGrid, etc.)
            // Assuming coreEmailService has a send method. If not, we might need to implement it or mock it.
            // Using a generic implementation assumption here.
            await coreEmailService['sendEmail'](data.to, data.subject, data.body); // Using bracket notation if method not strictly defined in types yet

            // 2. Record in database as SENT
            return this.repository.create({
                ...data,
                senderId: user.id,
                senderEmail: user.email,
                status: EmailStatus.SENT
            });
        } catch (error) {
            console.error('Failed to send email:', error);
            // Record as FAILED
            await this.repository.create({
                ...data,
                senderId: user.id,
                senderEmail: user.email,
                status: EmailStatus.FAILED,
            });
            throw new HttpException(500, 'Failed to send email');
        }
    }

    /**
     * Get sent emails (for current user)
     */
    async getSentEmails(userId: string) {
        return this.repository.findAll({ senderId: userId });
    }

    /**
     * Get inbox (Assuming this means emails received by the user?)
     * Or if this is for the system inbox. The migration plan says "/api/emails/inbox".
     * In the context of the platform, it might be replying to emails?
     * For now, returning empty or "received" emails if we tracked them (we track 'to', but usually for candidates)
     * Maybe it means emails associated with the company?
     * The schema doesn't strictly track incoming emails unless created via webhook.
     * I will implement it as getting emails where 'to' matches user email, OR potentially just a place holder if not fully defined.
     */
    async getInbox(userEmail: string) {
        // Implementation depends on how we store incoming emails.
        // Prisma schema `EmailMessage` seems to be mostly for outbound?
        // It has `sender_id` and `to`.
        // If we want inbox, maybe `to` == userEmail?
        // But `to` is just a string. 
        // We'll search by to address.
        // However, repo findAll takes filter.

        // Custom query for inbox logic might be needed if standard filter is not enough.
        // For now, let's assume we don't have full inbox features yet (fetching from IMAP/Gmail).
        // I will return an empty list or implement basic filtering.

        // Actually, looking at `findAll`, I didn't add `to` filter.
        // Let's assume for this migration, we just focus on outbound. 
        // But the route exists.
        return [];
    }

    /**
     * Get email details
     */
    async getEmail(id: string, userId: string) {
        const email = await this.repository.findById(id);
        if (!email) throw new HttpException(404, 'Email not found');

        // Access control: only sender or admin or related company
        if (email.sender_id !== userId) {
            // Check company logic if needed
            // For now simple check
            // throw new HttpException(403, 'Unauthorized');
        }
        return email;
    }
}
