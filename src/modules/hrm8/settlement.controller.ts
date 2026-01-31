import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { SettlementService } from './settlement.service';
import { SettlementRepository } from './settlement.repository';
import { Hrm8AuthenticatedRequest } from '../../types';

export class SettlementController extends BaseController {
    private settlementService: SettlementService;

    constructor() {
        super();
        this.settlementService = new SettlementService(new SettlementRepository());
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.query;
            const result = await this.settlementService.getAll({
                regionId: regionId as string,
                regionIds: req.assignedRegionIds,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getStats = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.query;
            const result = await this.settlementService.getStats({
                regionId: regionId as string,
                regionIds: req.assignedRegionIds,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
