import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { VideoInterviewService, videoInterviewService } from './video-interview.service';
import { AuthenticatedRequest } from '../../types';
import { HttpException } from '../../core/http-exception';

export class VideoInterviewController extends BaseController {
  constructor(private service: VideoInterviewService = videoInterviewService) {
    super('video-interviews');
  }

  getInterview = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new HttpException(401, 'Unauthorized'), 401);
      }

      const { id } = req.params;

      if (!id) {
        return this.sendError(res, new HttpException(400, 'Interview ID is required'), 400);
      }

      const interview = await this.service.getInterviewById(id);

      return this.sendSuccess(res, interview, 'Interview retrieved successfully');
    } catch (error) {
      if (error instanceof HttpException) {
        return this.sendError(res, error, error.status);
      }
      return this.sendError(res, error, 400);
    }
  };

  getJobInterviews = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new HttpException(401, 'Unauthorized'), 401);
      }

      const { jobId } = req.params;

      if (!jobId) {
        return this.sendError(res, new HttpException(400, 'Job ID is required'), 400);
      }

      const interviews = await this.service.getJobInterviews(jobId);

      return this.sendSuccess(
        res,
        interviews,
        `Retrieved ${interviews.length} interview(s) for job`
      );
    } catch (error) {
      if (error instanceof HttpException) {
        return this.sendError(res, error, error.status);
      }
      return this.sendError(res, error, 400);
    }
  };

  deleteInterview = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new HttpException(401, 'Unauthorized'), 401);
      }

      const { id } = req.params;

      if (!id) {
        return this.sendError(res, new HttpException(400, 'Interview ID is required'), 400);
      }

      await this.service.deleteInterview(id, req.user.id, req.user.role);

      return this.sendSuccess(res, { id }, 'Interview deleted successfully', 200);
    } catch (error) {
      if (error instanceof HttpException) {
        return this.sendError(res, error, error.status);
      }
      return this.sendError(res, error, 400);
    }
  };
}

export const videoInterviewController = new VideoInterviewController();
