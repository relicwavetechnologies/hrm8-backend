import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { Hrm8ProfileService } from './profile.service';
import { Hrm8Repository } from './hrm8.repository';
import { RegionalLicenseeRepository } from './regional-licensee.repository';
import { Hrm8AuthenticatedRequest } from '../../types';

export class Hrm8ProfileController extends BaseController {
  private profileService: Hrm8ProfileService;

  constructor() {
    super();
    this.profileService = new Hrm8ProfileService(
      new Hrm8Repository(),
      new RegionalLicenseeRepository()
    );
  }

  getProfile = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      if (!req.hrm8User) return this.sendError(res, new Error('Not authenticated'));
      const profile = await this.profileService.getProfile(req.hrm8User.id);
      return this.sendSuccess(res, { profile });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateProfile = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      if (!req.hrm8User) return this.sendError(res, new Error('Not authenticated'));
      const profile = await this.profileService.updateProfile(req.hrm8User.id, req.body);
      return this.sendSuccess(res, { profile });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
