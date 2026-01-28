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
        const where = this.buildWhere(filter);

        return this.prisma.emailMessage.findMany({
            where,
            orderBy: { sent_at: 'desc' },
            skip: (page - 1) * limit,
            take: Number(limit),
            include: {
                job: { select: { title: true } },
                email_template: { select: { name: true } }
            }
        });
    }

    /**
     * Count emails matching filter
     */
    async count(filter: EmailFilter) {
        const where = this.buildWhere(filter);
        return this.prisma.emailMessage.count({ where });
    }

    /**
     * Internal helper to build where clause
     */
    private buildWhere(filter: EmailFilter) {
        const where: any = {};
        if (filter.senderId) where.sender_id = filter.senderId;
        if (filter.status) where.status = filter.status;
        if (filter.jobId) where.job_id = filter.jobId;
        if (filter.candidateId) where.candidate_id = filter.candidateId;
        if (filter.applicationId) where.application_id = filter.applicationId;
        if (filter.jobRoundId) where.job_round_id = filter.jobRoundId;

        // Date range
        if (filter.startDate || filter.endDate) {
            where.sent_at = {};
            if (filter.startDate) where.sent_at.gte = new Date(filter.startDate);
            if (filter.endDate) where.sent_at.lte = new Date(filter.endDate);
        }

        return where;
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
