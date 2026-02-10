import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { StaffService } from './staff.service';
import { StaffRepository } from './staff.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { ConsultantRole, ConsultantStatus } from '@prisma/client';
import { env } from '../../config/env';
import { generateInvitationToken } from '../../utils/token';

export class StaffController extends BaseController {
    private staffService: StaffService;

    constructor() {
        super();
        this.staffService = new StaffService(new StaffRepository());
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId, role, status } = req.query;
            const result = await this.staffService.getAll({
                regionId: regionId as string,
                regionIds: req.assignedRegionIds,
                role: role as ConsultantRole,
                status: status as ConsultantStatus,
            });
            return this.sendSuccess(res, { consultants: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getOverview = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.query;
            const result = await this.staffService.getOverview({
                regionId: regionId as string,
                regionIds: req.assignedRegionIds,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getById = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.staffService.getById(id as string);
            return this.sendSuccess(res, { consultant: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    create = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.staffService.create(req.body);
            return this.sendSuccess(res, { consultant: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    update = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.staffService.update(id as string, req.body);
            return this.sendSuccess(res, { consultant: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    assignRegion = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { regionId } = req.body;
            const result = await this.staffService.assignRegion(id as string, regionId as string);
            return this.sendSuccess(res, { consultant: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    suspend = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.staffService.suspend(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    reactivate = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.staffService.reactivate(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    delete = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            await this.staffService.delete(id as string);
            return this.sendSuccess(res, { message: 'Consultant deleted successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    generateEmail = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { firstName, lastName, consultantId } = req.body;
            const result = await this.staffService.generateEmail(firstName, lastName, consultantId);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    reassignJobs = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { targetConsultantId } = req.body;
            const result = await this.staffService.reassignJobs(id as string, targetConsultantId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getPendingTasks = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.staffService.getPendingTasks(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getReassignmentOptions = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const consultant = await this.staffService.getById(id as string);
            const result = await this.staffService.getConsultantsForReassignment(
                id as string,
                consultant.role,
                consultant.regionId as string
            );
            return this.sendSuccess(res, { consultants: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    changeRole = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { role, taskAction, targetConsultantId } = req.body;
            const result = await this.staffService.changeRoleWithTaskHandling(
                id as string,
                role as ConsultantRole,
                taskAction as string,
                targetConsultantId as string
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    invite = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const token = generateInvitationToken();
            const baseUrl = env.FRONTEND_URL || 'http://localhost:3000';
            const inviteLink = `${baseUrl}/consultant/setup-account?token=${token}&consultantId=${id}`;
            return this.sendSuccess(res, {
                message: 'Invitation link generated',
                data: { inviteLink }
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
