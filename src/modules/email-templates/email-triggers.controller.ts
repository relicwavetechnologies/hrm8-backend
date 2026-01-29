import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { EmailTriggerService } from './email-triggers.service';
import { EmailTriggerRepository } from './email-triggers.repository';
import { AuthenticatedRequest } from '../../types';
import { CreateTriggerRequest, UpdateTriggerRequest, TestTriggerRequest } from './email-triggers.types';

export class EmailTriggerController extends BaseController {
    private service: EmailTriggerService;

    constructor() {
        super('email-triggers');
        this.service = new EmailTriggerService(new EmailTriggerRepository());
    }

    /**
     * Get all triggers
     * GET /api/email-triggers
     */
    getTriggers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const jobRoundId = req.query.jobRoundId as string;
            const templateId = req.query.templateId as string;
            const triggers = await this.service.getTriggers({
                jobRoundId,
                templateId
            });
            return this.sendSuccess(res, triggers);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get trigger details
     * GET /api/email-triggers/:id
     */
    getTrigger = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const trigger = await this.service.getTrigger(id);
            return this.sendSuccess(res, trigger);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Create trigger
     * POST /api/email-triggers
     */
    createTrigger = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const data: CreateTriggerRequest = req.body;
            const trigger = await this.service.createTrigger(data, req.user);
            return this.sendSuccess(res, trigger, 'Trigger created successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Update trigger
     * PUT /api/email-triggers/:id
     */
    updateTrigger = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const data: UpdateTriggerRequest = req.body;
            const trigger = await this.service.updateTrigger(id, data, req.user);
            return this.sendSuccess(res, trigger, 'Trigger updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Delete trigger
     * DELETE /api/email-triggers/:id
     */
    deleteTrigger = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            await this.service.deleteTrigger(id, req.user);
            return this.sendSuccess(res, { success: true }, 'Trigger deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Test trigger
     * POST /api/email-triggers/:id/test
     */
    testTrigger = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const data: TestTriggerRequest = req.body;
            const result = await this.service.testTrigger(id, data);
            return this.sendSuccess(res, result, 'Trigger test completed');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
