import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AuthenticatedRequest, Hrm8AuthenticatedRequest } from '../../types';
import { AssistantService } from './assistant.service';

export class AssistantController extends BaseController {
  private readonly service = new AssistantService();

  companyChat = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'), 401);
      }

      const result = await this.service.chat(
        {
          actorType: 'COMPANY_USER',
          userId: req.user.id,
          email: req.user.email,
          companyId: req.user.companyId,
          role: req.user.role,
        },
        req.body
      );

      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error, 400);
    }
  };

  hrm8Chat = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      if (!req.hrm8User) {
        return this.sendError(res, new Error('Not authenticated'), 401);
      }

      const result = await this.service.chat(
        {
          actorType: 'HRM8_USER',
          userId: req.hrm8User.id,
          email: req.hrm8User.email,
          role: req.hrm8User.role,
          licenseeId: req.hrm8User.licenseeId,
          assignedRegionIds: req.assignedRegionIds,
        },
        req.body
      );

      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error, 400);
    }
  };
}
