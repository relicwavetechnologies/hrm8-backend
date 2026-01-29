import { BaseRepository } from '../../core/repository';
import { TriggerType } from '@prisma/client';

export class EmailTriggerRepository extends BaseRepository {
    /**
     * Find all triggers (optionally filtered by job round or template)
     */
    async findAll(filters?: { jobRoundId?: string; templateId?: string }) {
        const where: any = {};
        if (filters?.jobRoundId) where.job_round_id = filters.jobRoundId;
        if (filters?.templateId) where.template_id = filters.templateId;

        return this.prisma.emailTemplateTrigger.findMany({
            where,
            include: {
                email_template: {
                    select: { name: true, subject: true }
                },
                job_round: {
                    select: { name: true, job_id: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    /**
     * Find trigger by ID
     */
    async findById(id: string) {
        return this.prisma.emailTemplateTrigger.findUnique({
            where: { id },
            include: {
                email_template: true,
                job_round: true
            }
        });
    }

    /**
     * Create trigger
     */
    async create(data: {
        templateId: string;
        jobRoundId: string;
        triggerType: TriggerType;
        triggerCondition?: any;
        delayDays?: number;
        delayHours?: number;
        scheduledTime?: string;
        isActive?: boolean;
    }) {
        return this.prisma.emailTemplateTrigger.create({
            data: {
                template_id: data.templateId,
                job_round_id: data.jobRoundId,
                trigger_type: data.triggerType,
                trigger_condition: data.triggerCondition,
                delay_days: data.delayDays,
                delay_hours: data.delayHours,
                scheduled_time: data.scheduledTime,
                is_active: data.isActive
            },
            include: {
                email_template: true,
                job_round: true
            }
        });
    }

    /**
     * Update trigger
     */
    async update(id: string, data: {
        templateId?: string;
        jobRoundId?: string;
        triggerType?: TriggerType;
        triggerCondition?: any;
        delayDays?: number;
        delayHours?: number;
        scheduledTime?: string;
        isActive?: boolean;
    }) {
        return this.prisma.emailTemplateTrigger.update({
            where: { id },
            data: {
                template_id: data.templateId,
                job_round_id: data.jobRoundId,
                trigger_type: data.triggerType,
                trigger_condition: data.triggerCondition,
                delay_days: data.delayDays,
                delay_hours: data.delayHours,
                scheduled_time: data.scheduledTime,
                is_active: data.isActive
            }
        });
    }

    /**
     * Delete trigger
     */
    async delete(id: string) {
        return this.prisma.emailTemplateTrigger.delete({
            where: { id }
        });
    }
}
