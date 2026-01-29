import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { FinanceService } from './finance.service';
import { FinanceRepository } from './finance.repository';
import { CommissionService } from './commission.service';
import { CommissionRepository } from './commission.repository';
import { AuthenticatedRequest, Hrm8AuthenticatedRequest } from '../../types';

export class FinanceController extends BaseController {
    private service: FinanceService;

    private commissionService: CommissionService;

    constructor() {
        super('hrm8-finance');
        this.service = new FinanceService(new FinanceRepository());
        this.commissionService = new CommissionService(new CommissionRepository());
    }

    // --- Commissions ---
    getCommissions = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const filters: any = {};
            if (req.query.consultantId) filters.consultantId = req.query.consultantId as string;
            if (req.query.regionId) filters.regionId = req.query.regionId as string;
            if (req.query.jobId) filters.jobId = req.query.jobId as string;
            if (req.query.status) filters.status = req.query.status;
            if (req.query.type) filters.type = req.query.type;

            // Regional Isolation
            if (req.assignedRegionIds && req.assignedRegionIds.length > 0) {
                if (filters.regionId) {
                    if (!req.assignedRegionIds.includes(filters.regionId)) {
                        return this.sendSuccess(res, { commissions: [] });
                    }
                } else {
                    filters.regionIds = req.assignedRegionIds;
                }
            }

            const result = await this.commissionService.getAllCommissions(filters);
            return this.sendSuccess(res, { commissions: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    getCommissionById = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.commissionService.getCommissionById(req.params.id as string);
            return this.sendSuccess(res, { commission: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    createCommission = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.commissionService.createCommission(req.body);
            return this.sendSuccess(res, { commission: result }, 201);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    getRegionalCommissions = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            // Reuse getCommissions logic or call service directly
            // Route: /api/hrm8/commissions/regional?regionId=...
            const regionId = req.query.regionId as string;
            // Security check
            if (req.assignedRegionIds && req.assignedRegionIds.length > 0) {
                if (!regionId || !req.assignedRegionIds.includes(regionId)) {
                    return this.sendError(res, new Error('Access denied to this region'), 403);
                }
            }

            const filters: any = { regionId };
            if (req.query.status) filters.status = req.query.status;

            const result = await this.commissionService.getAllCommissions(filters);
            return this.sendSuccess(res, { commissions: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    confirmCommission = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.commissionService.confirmCommission(req.params.id as string);
            return this.sendSuccess(res, { commission: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    markCommissionPaid = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            // Regional security check handling? Service doesn't check owner.
            // Controller should check if commission belongs to allowed region.
            // We need to fetch commission first to check region.
            const commission = await this.commissionService.getCommissionById(req.params.id as string);
            if (req.assignedRegionIds && req.assignedRegionIds.length > 0) {
                if (!commission.regionId || !req.assignedRegionIds.includes(commission.regionId)) {
                    return this.sendError(res, new Error('Access denied'), 403);
                }
            }

            const result = await this.commissionService.markCommissionPaid(req.params.id as string, req.body.paymentReference);
            return this.sendSuccess(res, { commission: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    // --- Revenue ---
    getRevenueSummary = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.getRevenueStats();
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    // --- Invoices ---
    getInvoices = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.getInvoices();
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    calculateSettlement = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.calculateSettlement(req.body);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    // --- Settlements Endpoints ---
    getSettlements = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { licenseeId, status, limit } = req.query;
            const result = await this.service.getSettlements({ licenseeId, status, limit });
            return this.sendSuccess(res, { settlements: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    getSettlementById = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.getSettlementById(req.params.id as string);
            if (!result) return this.sendError(res, new Error('Settlement not found'), 404);
            return this.sendSuccess(res, { settlement: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    updateSettlement = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.updateSettlement(req.params.id as string, req.body);
            return this.sendSuccess(res, { settlement: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }



    getSettlementStats = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.getSettlementStats();
            return this.sendSuccess(res, { stats: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    generateSettlement = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.generateSettlement(req.params.licenseeId as string, new Date());
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    generateAllSettlements = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.generateAllPendingSettlements(new Date());
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    markSettlementPaid = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.markSettlementPaid(req.params.id as string, req.body.paymentReference);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    // --- Detailed Revenue Endpoints ---
    getRevenueByRegion = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.getRevenueByRegion(req.params.regionId as string, req.query);
            return this.sendSuccess(res, { revenues: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    calculateMonthlyRevenue = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.calculateMonthlyRevenue(req.params.regionId as string, new Date(req.body.month));
            return this.sendSuccess(res, { breakdown: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    processAllRegionsRevenue = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.service.processAllRegionsForMonth(new Date(req.body.month));
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }
}
