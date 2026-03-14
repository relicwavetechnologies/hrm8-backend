import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { ConsultantAssignmentRequestService } from './consultant-assignment-request.service';
import { Hrm8AuthenticatedRequest } from '../../types';

export class ConsultantAssignmentRequestController extends BaseController {
  private service = new ConsultantAssignmentRequestService();

  listPending = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const scope = (req.query.scope as string) || 'my_regions';
      const isGlobalAdmin = req.hrm8User?.role === 'GLOBAL_ADMIN';

      const filters: { regionIds?: string[]; licenseeId?: string } = {};

      if (scope === 'all' && isGlobalAdmin) {
        // GLOBAL_ADMIN with scope=all: no region filter
      } else if (req.assignedRegionIds && req.assignedRegionIds.length > 0) {
        filters.regionIds = req.assignedRegionIds;
      } else if (req.hrm8User?.licenseeId && !isGlobalAdmin) {
        filters.licenseeId = req.hrm8User.licenseeId;
      }

      const requests = await this.service.listPending(filters);
      return this.sendSuccess(res, { requests });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  assign = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { consultantId, skipRegionCheck } = req.body;
      if (!consultantId) {
        return this.sendError(res, new Error('consultantId is required'));
      }
      const result = await this.service.assign(
        id as string,
        consultantId as string,
        req.hrm8User?.id || 'unknown',
        { skipRegionCheck: !!skipRegionCheck }
      );
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
