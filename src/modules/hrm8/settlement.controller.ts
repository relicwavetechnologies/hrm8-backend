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
            const { regionId, status, region_id } = req.query as Record<string, string | undefined>;
            const regionIdValue = (regionId || region_id) ? String(regionId || region_id) : undefined;
            const result = await this.settlementService.getAll({
                regionId: regionIdValue,
                regionIds: req.assignedRegionIds,
                status: status as string,
            });
            return this.sendSuccess(res, { settlements: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getStats = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId, region_id } = req.query as Record<string, string | undefined>;
            const regionIdValue = (regionId || region_id) ? String(regionId || region_id) : undefined;
            const result = await this.settlementService.getStats({
                regionId: regionIdValue,
                regionIds: req.assignedRegionIds,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
    markAsPaid = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const id = String((req.params as any).id);
            const { paymentDate, paymentReference, payment_date, payment_reference } = req.body;
            const result = await this.settlementService.markAsPaid(id, {
                paymentDate: new Date((paymentDate || payment_date) as string),
                paymentReference: (paymentReference || payment_reference) as string,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
