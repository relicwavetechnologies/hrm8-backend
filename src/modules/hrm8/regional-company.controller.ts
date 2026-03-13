import { Response, NextFunction } from 'express';
import { RegionalCompanyService } from './regional-company.service';
import { Hrm8AuthenticatedRequest } from '../../types';

export class RegionalCompanyController {
  private regionalCompanyService: RegionalCompanyService;

  constructor() {
    this.regionalCompanyService = new RegionalCompanyService();
  }

  private getParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0];
    return value || '';
  }

  private getCompanyAccess(req: Hrm8AuthenticatedRequest) {
    return {
      role: req.hrm8User?.role,
      assignedRegionIds: req.assignedRegionIds,
    };
  }

  getAll = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit, search, status, regionId } = req.query as Record<string, string | undefined>;
      const result = await this.regionalCompanyService.listCompanies({
        ...this.getCompanyAccess(req),
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search,
        status,
        regionId: regionId || undefined,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = this.getParam(req.params.id);
      const result = await this.regionalCompanyService.getById(id, this.getCompanyAccess(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getOverview = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = this.getParam(req.params.id);
      const result = await this.regionalCompanyService.getOverview(id, this.getCompanyAccess(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getActivity = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = this.getParam(req.params.id);
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const result = await this.regionalCompanyService.getActivity(id, {
        ...this.getCompanyAccess(req),
        limit,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getCompanyUsers = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = this.getParam(req.params.id);
      const result = await this.regionalCompanyService.getCompanyUsers(id, this.getCompanyAccess(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getPricingContext = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = this.getParam(req.params.id);
      const result = await this.regionalCompanyService.getPricingContext(id, this.getCompanyAccess(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getPricingOverrides = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = this.getParam(req.params.id);
      const result = await this.regionalCompanyService.getPricingOverrides(id, this.getCompanyAccess(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  createPricingOverride = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = this.getParam(req.params.id);
      const actorId = req.hrm8User?.id || 'system';
      const result = await this.regionalCompanyService.createPricingOverride(
        id,
        req.body,
        actorId,
        this.getCompanyAccess(req)
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  activatePricingOverride = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = this.getParam(req.params.id);
      const overrideId = this.getParam(req.params.overrideId);
      const actorId = req.hrm8User?.id || 'system';
      const result = await this.regionalCompanyService.activatePricingOverride(
        companyId,
        overrideId,
        actorId,
        this.getCompanyAccess(req)
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  deactivatePricingOverride = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const companyId = this.getParam(req.params.id);
      const overrideId = this.getParam(req.params.overrideId);
      const actorId = req.hrm8User?.id || 'system';
      const result = await this.regionalCompanyService.deactivatePricingOverride(
        companyId,
        overrideId,
        actorId,
        this.getCompanyAccess(req)
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getCompanyJobs = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = this.getParam(req.params.id);
      const result = await this.regionalCompanyService.getCompanyJobs(id, this.getCompanyAccess(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
