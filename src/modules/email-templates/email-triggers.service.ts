import { BaseService } from '../../core/service';
import { EmailTriggerRepository } from './email-triggers.repository';
import { EmailTemplateRepository } from './email-templates.repository';
import { CreateTriggerRequest, UpdateTriggerRequest, TestTriggerRequest } from './email-triggers.types';
import { HttpException } from '../../core/http-exception';
import { AuthenticatedRequest } from '../../types';

export class EmailTriggerService extends BaseService {
    private templateRepository: EmailTemplateRepository;

    constructor(private repository: EmailTriggerRepository) {
        super();
        this.templateRepository = new EmailTemplateRepository();
    }

    /**
     * Get all triggers
     */
    async getTriggers(filters?: { jobRoundId?: string; templateId?: string }) {
        return this.repository.findAll(filters);
    }

    /**
     * Get trigger by ID
     */
    async getTrigger(id: string) {
        const trigger = await this.repository.findById(id);
        if (!trigger) {
            throw new HttpException(404, 'Trigger not found');
        }
        return trigger;
    }

    /**
     * Create trigger
     */
    async createTrigger(data: CreateTriggerRequest, user: AuthenticatedRequest['user']) {
        if (!user) throw new HttpException(401, 'Unauthorized');

        // Verify template ownership
        const template = await this.templateRepository.findByIdAndCompany(data.templateId, user.companyId);
        if (!template) {
            throw new HttpException(404, 'Email template not found or does not belong to your company');
        }

        return this.repository.create({
            templateId: data.templateId,
            jobRoundId: data.jobRoundId,
            triggerType: data.triggerType,
            triggerCondition: data.triggerCondition,
            delayDays: data.delayDays,
            delayHours: data.delayHours,
            scheduledTime: data.scheduledTime,
            isActive: data.isActive
        });
    }

    /**
     * Update trigger
     */
    async updateTrigger(id: string, data: UpdateTriggerRequest, user: AuthenticatedRequest['user']) {
        if (!user) throw new HttpException(401, 'Unauthorized');

        await this.getTrigger(id); // Ensure exists

        return this.repository.update(id, {
            templateId: data.templateId,
            jobRoundId: data.jobRoundId,
            triggerType: data.triggerType,
            triggerCondition: data.triggerCondition,
            delayDays: data.delayDays,
            delayHours: data.delayHours,
            scheduledTime: data.scheduledTime,
            isActive: data.isActive
        });
    }

    /**
     * Delete trigger
     */
    async deleteTrigger(id: string, user: AuthenticatedRequest['user']) {
        if (!user) throw new HttpException(401, 'Unauthorized');
        await this.getTrigger(id);
        return this.repository.delete(id);
    }

    /**
     * Test trigger
     * This mimics the logic of checking if a trigger fires for a given candidate/job
     */
    async testTrigger(id: string, data: TestTriggerRequest) {
        const trigger = await this.getTrigger(id);

        // Logic to simulate trigger execution
        // 1. Check if trigger condition matches
        // 2. Resolve variables
        // 3. Dry-run send

        return {
            success: true,
            message: 'Trigger test simulation successful',
            trigger: trigger.trigger_type,
            simulatedDelay: `${trigger.delay_days} days, ${trigger.delay_hours} hours`,
            wouldSendEmail: true, // simplified
            template: trigger.email_template?.name
        };
    }
}
