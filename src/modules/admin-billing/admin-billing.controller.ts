import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AdminBillingService } from './admin-billing.service';
import { AdminBillingRepository } from './admin-billing.repository';
import { AuthenticatedRequest } from '../../types';
import { HttpException } from '../../core/http-exception';

export class AdminBillingController extends BaseController {
  private service: AdminBillingService;

  constructor() {
    super();
    this.service = new AdminBillingService(new AdminBillingRepository());
  }

  private requireAdmin(req: AuthenticatedRequest) {
    if (req.user?.role !== 'SUPER_ADMIN') {
      throw new HttpException(403, 'Unauthorized: Admin only');
    }
  }
  private getParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0];
    return value || '';
  }

  // --- Commissions ---
  getCommissions = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const commissions = await this.service.getCommissions(limit, offset);
      return this.sendSuccess(res, { commissions, limit, offset });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getConsultantCommissions = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const consultantId = this.getParam(req.params.consultantId);
      const result = await this.service.getConsultantCommissions(consultantId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  payCommission = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const commissionId = this.getParam(req.params.commissionId);
      const commission = await this.service.payCommission(commissionId);
      return this.sendSuccess(res, { commission });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  bulkPayCommissions = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const { commissionIds } = req.body;
      const result = await this.service.bulkPayCommissions(commissionIds);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Revenue ---
  getPendingRevenue = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const revenue = await this.service.getPendingRevenue();
      return this.sendSuccess(res, { revenue });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getRegionalRevenue = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const regionId = this.getParam(req.params.regionId);
      const result = await this.service.getRegionalRevenue(regionId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  calculateMonthlyRevenue = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const regionId = this.getParam(req.params.regionId);
      const result = await this.service.calculateMonthlyRevenue(regionId);
      return this.sendSuccess(res, { result });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  processAllRegionsRevenue = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const result = await this.service.processAllRegionsRevenue();
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Settlements ---
  getSettlements = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const settlements = await this.service.getSettlements(limit, offset);
      return this.sendSuccess(res, { settlements, limit, offset });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getSettlementById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const settlementId = this.getParam(req.params.settlementId);
      const settlement = await this.service.getSettlementById(settlementId);
      return this.sendSuccess(res, { settlement });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getSettlementStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const stats = await this.service.getSettlementStats();
      return this.sendSuccess(res, { stats });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  generateSettlement = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const licenseeId = this.getParam(req.params.licenseeId);
      const settlement = await this.service.generateSettlement(licenseeId);
      res.status(201);
      return this.sendSuccess(res, { settlement });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  generateAllSettlements = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const result = await this.service.generateAllSettlements();
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  markSettlementPaid = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const settlementId = this.getParam(req.params.settlementId);
      const settlement = await this.service.markSettlementPaid(settlementId);
      return this.sendSuccess(res, { settlement });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Attribution ---
  getAttribution = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const companyId = this.getParam(req.params.companyId);
      const attribution = await this.service.getAttribution(companyId);
      return this.sendSuccess(res, { attribution });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getAttributionHistory = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const companyId = this.getParam(req.params.companyId);
      const history = await this.service.getAttributionHistory(companyId);
      return this.sendSuccess(res, { history });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  lockAttribution = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const companyId = this.getParam(req.params.companyId);
      const attribution = await this.service.lockAttribution(companyId);
      return this.sendSuccess(res, { attribution });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  overrideAttribution = async (req: AuthenticatedRequest, res: Response) => {
    try {
      this.requireAdmin(req);

      const companyId = this.getParam(req.params.companyId);
      const attribution = await this.service.overrideAttribution(companyId, req.body);
      return this.sendSuccess(res, { attribution });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
