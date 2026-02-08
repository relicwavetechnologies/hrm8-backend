import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { LeadConversionService } from './lead-conversion.service';
import { LeadConversionRepository } from './lead-conversion.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { ConversionRequestStatus } from '@prisma/client';

export class LeadConversionController extends BaseController {
    private leadConversionService: LeadConversionService;

    constructor() {
        super();
        this.leadConversionService = new LeadConversionService(new LeadConversionRepository());
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { status } = req.query;
            const result = await this.leadConversionService.getAll({
                status: status as ConversionRequestStatus,
                regionIds: req.assignedRegionIds,
            });
            return this.sendSuccess(res, { requests: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getOne = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.leadConversionService.getOne(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    approve = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { adminNotes } = req.body;
            const result = await this.leadConversionService.approve(
                id as string,
                {
                    id: req.hrm8User?.id || 'unknown',
                    email: req.hrm8User?.email || 'unknown',
                    role: req.hrm8User?.role || 'UNKNOWN'
                },
                adminNotes,
                {
                    ip: req.ip,
                    userAgent: req.get('user-agent') || undefined
                }
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    decline = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { declineReason } = req.body;
            const result = await this.leadConversionService.decline(
                id as string,
                {
                    id: req.hrm8User?.id || 'unknown',
                    email: req.hrm8User?.email || 'unknown',
                    role: req.hrm8User?.role || 'UNKNOWN'
                },
                declineReason,
                {
                    ip: req.ip,
                    userAgent: req.get('user-agent') || undefined
                }
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
