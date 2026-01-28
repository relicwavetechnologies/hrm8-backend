import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { InterviewService } from './interview.service';
import { InterviewRepository } from './interview.repository';
import { AuthenticatedRequest } from '../../types';

export class InterviewController extends BaseController {
  private service: InterviewService;

  constructor() {
    super('interview');
    this.service = new InterviewService(new InterviewRepository());
  }

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

      const { applicationId, jobRoundId, scheduledDate, duration, type, meetingLink, interviewerIds, notes } = req.body;

      const result = await this.service.createInterview({
        applicationId, jobRoundId, scheduledDate, duration, type,
        scheduledBy: req.user.id,
        meetingLink, interviewerIds, notes
      });
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  listByJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.service.listByJob(req.params.jobId as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  getById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.service.getById(req.params.id as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  updateStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.service.updateStatus(req.params.id as string, req.body.status, req.body.notes);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  addFeedback = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.service.addFeedback(req.params.id as string, req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  getInterviews = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters = req.query; // Typed properly in real app
      const result = await this.service.getInterviews({
        jobId: filters.jobId as string,
        jobRoundId: filters.jobRoundId as string,
        status: filters.status as string,
        startDate: filters.startDate ? new Date(filters.startDate as string) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate as string) : undefined
      });
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  getCalendarEvents = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { jobId, start, end } = req.query;
      // Reuse list logic with transformation via service if needed, 
      // or just call getInterviews and transform here.
      // For now, simple list.
      const interviews = await this.service.getInterviews({
        jobId: jobId as string,
        startDate: start ? new Date(start as string) : undefined,
        endDate: end ? new Date(end as string) : undefined
      });

      const events = interviews.map((i: any) => ({
        id: i.id,
        title: i.application?.candidate
          ? `Interview: ${i.application.candidate.first_name}`
          : `Interview`,
        start: i.scheduled_date,
        end: new Date(new Date(i.scheduled_date).getTime() + (i.duration * 60000)),
        extendedProps: {
          interviewId: i.id,
          type: i.type,
          status: i.status
        }
      }));

      return this.sendSuccess(res, events);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  rescheduleInterview = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const result = await this.service.rescheduleInterview(
        req.params.id as string,
        new Date(req.body.newScheduledDate),
        req.body.reason,
        req.user.id
      );
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  cancelInterview = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const result = await this.service.cancelInterview(
        req.params.id as string,
        req.body.reason,
        req.user.id
      );
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  markAsNoShow = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const result = await this.service.markAsNoShow(
        req.params.id as string,
        req.body.reason,
        req.user.id
      );
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  bulkReschedule = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.service.bulkReschedule(req.body.ids, new Date(req.body.newDate));
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  bulkCancel = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.service.bulkCancel(req.body.ids, req.body.reason);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  }
}
