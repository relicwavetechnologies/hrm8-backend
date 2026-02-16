import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AuthenticatedRequest, Hrm8AuthenticatedRequest, ConsultantAuthenticatedRequest } from '../../types';
import { AssistantService } from './assistant.service';
import { AssistantStreamService } from './assistant.stream.service';
import { prisma } from '../../utils/prisma';

export class AssistantController extends BaseController {
  private readonly service = new AssistantService();
  private readonly streamService = new AssistantStreamService();

  companyChat = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Not authenticated'), 401);
      }

      const result = await this.service.chat(
        {
          actorType: 'COMPANY_USER',
          userId: req.user.id,
          email: req.user.email || '',
          companyId: req.user.companyId || '',
          role: req.user.role || 'USER',
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
          email: req.hrm8User.email || '',
          role: req.hrm8User.role,
          licenseeId: req.hrm8User.licenseeId || '',
          assignedRegionIds: req.assignedRegionIds || [],
        },
        req.body
      );

      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error, 400);
    }
  };

  consultantChatStream = async (req: ConsultantAuthenticatedRequest, res: Response) => {
    try {
      if (!req.consultant) {
        console.error('[Assistant] Consultant not authenticated');
        return this.sendError(res, new Error('Not authenticated'), 401);
      }

      console.log('[Assistant] Consultant authenticated:', {
        id: req.consultant.id,
        email: req.consultant.email,
        role: req.consultant.role,
      });

      // Fetch consultant details to get region_id
      const consultant = await prisma.consultant.findUnique({
        where: { id: req.consultant.id },
        select: { id: true, email: true, role: true, region_id: true },
      });

      console.log('[Assistant] Consultant from DB:', consultant);

      if (!consultant) {
        console.error('[Assistant] Consultant not found in database');
        return this.sendError(res, new Error('Consultant not found'), 404);
      }

      if (!consultant.region_id) {
        console.error('[Assistant] Consultant has no region assigned');
        return this.sendError(res, new Error('No region assigned to consultant'), 400);
      }

      console.log('[Assistant] Starting stream for consultant:', {
        consultantId: req.consultant.id,
        regionId: consultant.region_id,
      });

      await this.streamService.streamHrm8(
        {
          actorType: 'CONSULTANT',
          userId: req.consultant.id,
          email: req.consultant.email,
          consultantId: req.consultant.id,
          regionId: consultant.region_id,
        },
        req.body,
        res
      );
      return;
    } catch (error) {
      console.error('[Assistant] Consultant stream error:', error);
      return this.sendError(res, error, 400);
    }
  };

  hrm8ChatStream = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      if (!req.hrm8User) {
        return this.sendError(res, new Error('Not authenticated'), 401);
      }

      await this.streamService.streamHrm8(
        {
          actorType: 'HRM8_USER',
          userId: req.hrm8User.id,
          email: req.hrm8User.email || '',
          role: req.hrm8User.role,
          licenseeId: req.hrm8User.licenseeId || '',
          assignedRegionIds: req.assignedRegionIds || [],
        },
        req.body,
        res
      );
      return;
    } catch (error) {
      return this.sendError(res, error, 400);
    }
  };
}
