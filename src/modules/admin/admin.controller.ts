import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AdminService } from './admin.service';
import { AuthenticatedRequest } from '../../types';

export class AdminController extends BaseController {
  private adminService: AdminService;

  constructor() {
    super();
    this.adminService = new AdminService();
  }

  // ========== CATEGORIES ==========

  // GET /api/admin/categories
  getCategories = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const categories = await this.adminService.getCategories();
      return this.sendSuccess(res, { categories });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/admin/categories
  createCategory = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const category = await this.adminService.createCategory(req.body);
      return this.sendSuccess(res, { category }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // PUT /api/admin/categories/:id
  updateCategory = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const category = await this.adminService.updateCategory(id, req.body);
      return this.sendSuccess(res, { category });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // DELETE /api/admin/categories/:id
  deleteCategory = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const result = await this.adminService.deleteCategory(id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // ========== TAGS ==========

  // GET /api/admin/tags
  getTags = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tags = await this.adminService.getTags();
      return this.sendSuccess(res, { tags });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/admin/tags
  createTag = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tag = await this.adminService.createTag(req.body);
      return this.sendSuccess(res, { tag }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // PUT /api/admin/tags/:id
  updateTag = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const tag = await this.adminService.updateTag(id, req.body);
      return this.sendSuccess(res, { tag });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // DELETE /api/admin/tags/:id
  deleteTag = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const result = await this.adminService.deleteTag(id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // ========== BILLING/WITHDRAWAL STUBS ==========

  // GET /api/admin/billing/invoices
  getBillingInvoices = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await this.adminService.getBillingInvoices(req.query);
      return this.sendSuccess(res, data);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/admin/billing/invoices
  createBillingInvoice = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invoice = await this.adminService.createBillingInvoice(req.body);
      return this.sendSuccess(res, { invoice }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/admin/withdrawals
  getWithdrawals = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await this.adminService.getWithdrawals(req.query);
      return this.sendSuccess(res, data);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // POST /api/admin/withdrawals/:id/process
  processWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const result = await this.adminService.processWithdrawal(id, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/admin/payment-stats
  getPaymentStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await this.adminService.getPaymentStats();
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // GET /api/admin/billing/settings
  getBillingSettings = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await this.adminService.getBillingSettings();
      return this.sendSuccess(res, settings);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // PUT /api/admin/billing/settings
  updateBillingSettings = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await this.adminService.updateBillingSettings(req.body);
      return this.sendSuccess(res, settings);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
