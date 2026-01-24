import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CompanyService } from './company.service';
import { CompanyRepository } from './company.repository';
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
}
