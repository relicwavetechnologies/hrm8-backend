import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { InterviewService } from './interview.service';
import { AuthenticatedRequest } from '../../types';

export class InterviewController extends BaseController {

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { applicationId, scheduledDate, duration, type, meetingLink, interviewerIds, notes } = req.body;

      const interview = await InterviewService.createInterview({
        applicationId,
        scheduledDate: new Date(scheduledDate),
        duration,
        type,
        meetingLink,
        interviewerIds,
        notes,
        scheduledBy: req.user?.id || 'system'
      });

      return this.sendSuccess(res, { interview });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  list = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { jobId, jobRoundId, status, startDate, endDate } = req.query;

      const interviews = await InterviewService.getInterviews({
        jobId: jobId as string,
        jobRoundId: jobRoundId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      return this.sendSuccess(res, { interviews });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  listByJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const jobId = req.params.jobId as string;
      const interviews = await InterviewService.getInterviews({ jobId });
      return this.sendSuccess(res, { interviews });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  listByApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId as string;
      const interviews = await InterviewService.getInterviews({ applicationId });
      return this.sendSuccess(res, { interviews });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const interview = await InterviewService.getInterviewById(id);
      if (!interview) return this.sendError(res, new Error('Interview not found'), 404);
      return this.sendSuccess(res, { interview });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const { status, notes } = req.body;
      const interview = await InterviewService.updateStatus(id, status, notes);
      return this.sendSuccess(res, { interview });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addFeedback = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const feedback = req.body; // Expects interviewer_id, overall_rating, etc.
      const interview = await InterviewService.addFeedback(id, feedback);
      return this.sendSuccess(res, { interview });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
  getProgressionStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const status = await InterviewService.getProgressionStatus(id);
      return this.sendSuccess(res, status);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
