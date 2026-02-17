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
    private getParam(value: string | string[] | undefined): string {
        if (Array.isArray(value)) return value[0];
        return value || '';
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId, status } = req.query;
            const result = await this.settlementService.getAll({
                regionId: regionId as string,
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
    markAsPaid = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            const { payment_date, payment_reference } = req.body;
            const paymentDate = payment_date;
            const paymentReference = payment_reference;
            let dateObj = new Date(paymentDate);

            // Handle DD/MM/YYYY format if new Date() fails or returns Invalid Date
            if (isNaN(dateObj.getTime()) && typeof paymentDate === 'string' && paymentDate.includes('/')) {
                const parts = paymentDate.split('/');
                if (parts.length === 3) {
                    // Assume DD/MM/YYYY
                    const [day, month, year] = parts;
                    // Note: Month is 0-indexed in Date constructor if numbers, but 1-indexed in string 'YYYY-MM-DD'
                    dateObj = new Date(`${year}-${month}-${day}`);
                }
            }

            if (isNaN(dateObj.getTime())) {
                return this.sendError(res, new Error('Invalid payment date format'));
            }

            const result = await this.settlementService.markAsPaid(id, {
                paymentDate: dateObj,
                paymentReference,
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
