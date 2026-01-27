import { BaseRepository } from '../../core/repository';
import { EmailStatus } from '@prisma/client';
import { SendEmailRequest, EmailFilter } from './emails.types';

export class EmailRepository extends BaseRepository {
    /**
     * Create email record
     */
    async create(data: SendEmailRequest & { senderId: string; senderEmail: string; status: EmailStatus }) {
        return this.prisma.emailMessage.create({
            data: {
                to: data.to,
                cc: data.cc || [],
                bcc: data.bcc || [],
                subject: data.subject,
                body: data.body,
                candidate_id: data.candidateId,
                job_id: data.jobId,
                application_id: data.applicationId,
                template_id: data.templateId,
                job_round_id: data.jobRoundId,
                sender_id: data.senderId,
                sender_email: data.senderEmail,
                status: data.status,
            }
        });
    }

    /**
     * Find emails
     */
    async findAll(filter: EmailFilter, page = 1, limit = 20) {
        const where: any = {};
        if (filter.senderId) where.sender_id = filter.senderId;
        if (filter.status) where.status = filter.status;
        if (filter.jobId) where.job_id = filter.jobId;
        // For 'inbox' concept - usually means received by someone.
        // In this system, if we are filtering by 'candidateId', it might mean emails sent TO the candidate?
        // The current model stores 'to', so we might search by 'to' email, or 'candidate_id' foreign key.

        // If candidateId is provided, we likely want emails where candidate_id matches.
        if (filter.candidateId) where.candidate_id = filter.candidateId;

        return this.prisma.emailMessage.findMany({
            where,
            orderBy: { sent_at: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                job: { select: { title: true } },
                email_template: { select: { name: true } }
            }
        });
    }

    /**
     * Find email by ID
     */
    async findById(id: string) {
        return this.prisma.emailMessage.findUnique({
            where: { id },
            include: {
                job: { select: { title: true } },
                email_template: { select: { name: true } }
            }
        });
    }

    /**
     * Update status
     */
    async updateStatus(id: string, status: EmailStatus, error?: string) {
        return this.prisma.emailMessage.update({
            where: { id },
            data: {
                status,
                error_message: error
            }
        });
    }
}
