import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CompanyService } from './company.service';
import { CompanyRepository } from './company.repository';
import { companyStatsService } from './company-stats.service';
import { AuthenticatedRequest } from '../../types';

export class CompanyController extends BaseController {
  private companyService: CompanyService;

  constructor() {
    super();
    this.companyService = new CompanyService(new CompanyRepository());
  }

  getCompany = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const company = await this.companyService.getCompany(id);
      return this.sendSuccess(res, { company });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateCompany = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      
      // Ensure user belongs to this company (simple authorization check)
      if (req.user?.companyId !== id) {
        return this.sendError(res, new Error('Unauthorized to update this company'));
      }

      const company = await this.companyService.updateCompany(id, req.body);
      return this.sendSuccess(res, { company });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Profile
  getProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      if (req.user?.companyId !== id) {
        return this.sendError(res, new Error('Unauthorized'));
      }
      const profile = await this.companyService.getProfile(id);
      return this.sendSuccess(res, { profile });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      if (req.user?.companyId !== id) {
        return this.sendError(res, new Error('Unauthorized'));
      }
      const profile = await this.companyService.updateProfile(id, req.body);
      return this.sendSuccess(res, { profile });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Verification (Admin only typically, or self-initiate)
  verifyByEmail = async (req: AuthenticatedRequest, res: Response) => {
    // Logic for verifying token would go here, often handled by AuthService or VerificationService
    // For now, placeholder or specific implementation if needed
    return this.sendSuccess(res, { message: 'Not implemented in this controller yet' });
  };

  // Settings
  getJobAssignmentSettings = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      if (req.user?.companyId !== id) {
        return this.sendError(res, new Error('Unauthorized'));
      }
      const settings = await this.companyService.getJobAssignmentSettings(id);
      return this.sendSuccess(res, settings);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateJobAssignmentMode = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      if (req.user?.companyId !== id) {
        return this.sendError(res, new Error('Unauthorized'));
      }
      const { mode } = req.body;
      const company = await this.companyService.updateJobAssignmentMode(id, mode);
      return this.sendSuccess(res, { company });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      if (req.user?.companyId !== id) {
        return this.sendError(res, new Error('Unauthorized'));
      }
      const stats = await companyStatsService.getCompanyStats(id);
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Transactions
  getTransactions = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return this.sendError(res, new Error('Unauthorized'));
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await this.companyService.getTransactions(companyId, limit, offset);
      return this.sendSuccess(res, { transactions, limit, offset });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getTransactionStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return this.sendError(res, new Error('Unauthorized'));
      }

      const stats = await this.companyService.getTransactionStats(companyId);
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Refund Requests
  createRefundRequest = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return this.sendError(res, new Error('Unauthorized'));
      }

      const { amount, reason, description, invoiceNumber } = req.body;

      const refundRequest = await this.companyService.createRefundRequest(companyId, {
        amount,
        reason,
        description,
        invoiceNumber
      });

      return this.sendSuccess(res, { refundRequest }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getRefundRequests = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return this.sendError(res, new Error('Unauthorized'));
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const refundRequests = await this.companyService.getRefundRequests(companyId, limit, offset);
      return this.sendSuccess(res, { refundRequests, limit, offset });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  cancelRefundRequest = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const companyId = req.user?.companyId;
      if (!companyId) {
        return this.sendError(res, new Error('Unauthorized'));
      }

      const result = await this.companyService.cancelRefundRequest(id, companyId);
      return this.sendSuccess(res, { message: 'Refund request cancelled', result });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  withdrawRefundRequest = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const companyId = req.user?.companyId;
      if (!companyId) {
        return this.sendError(res, new Error('Unauthorized'));
      }

      const refundRequest = await this.companyService.withdrawRefundRequest(id, companyId);
      return this.sendSuccess(res, { refundRequest });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
