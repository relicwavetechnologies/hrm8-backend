import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { VideoInterviewService } from './video-interviews.service';
import { VideoInterviewRepository } from './video-interviews.repository';
import { AuthenticatedRequest } from '../../types';
import {
    CreateInterviewRequest,
    UpdateInterviewRequest,
    SubmitFeedbackRequest,
    AutoScheduleRequest,
    FinalizeInterviewRequest,
    SendInvitationRequest,
    AutoScheduleResponse,
    ProgressionStatusResponse,
    CalendarEventResponse
} from './video-interviews.types';

export class VideoInterviewController extends BaseController {
    private service: VideoInterviewService;

    constructor() {
        super('video-interviews');
        this.service = new VideoInterviewService(new VideoInterviewRepository());
    }

    /**
     * Schedule an interview
     */
    scheduleInterview = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) {
                return this.sendError(res, new Error('User not authenticated'));
            }
            const data: CreateInterviewRequest = req.body;
            const interview = await this.service.scheduleInterview(data, req.user.id);
            return this.sendSuccess(res, interview, 'Interview scheduled successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get Interview Details
     */
    getInterview = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const interview = await this.service.getInterview(id as string);
            if (!interview) {
                return this.sendError(res, new Error('Interview not found')); // Should use 404
            }
            return this.sendSuccess(res, interview);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get Interviews for a Job
     */
    getJobInterviews = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { jobId } = req.params;
            const interviews = await this.service.getJobInterviews(jobId as string);
            return this.sendSuccess(res, interviews);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get all interviews for the company
     */
    getCompanyInterviews = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.companyId) {
                return this.sendError(res, new Error('Company ID not found in request'), 400);
            }
            const interviews = await this.service.getCompanyInterviews(req.user.companyId);
            return this.sendSuccess(res, interviews);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get interviews for an application (Candidate)
     */
    getApplicationInterviews = async (req: any, res: Response) => {
        try {
            const { applicationId } = req.params;
            const interviews = await this.service.getApplicationInterviews(applicationId);
            return this.sendSuccess(res, interviews);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Update Interview Status
     */
    updateStatus = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const { id } = req.params;
            const { status } = req.body;
            const result = await this.service.updateStatus(id as string, status, req.user.id);
            return this.sendSuccess(res, result, 'Interview status updated');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Reschedule Interview
     */
    rescheduleInterview = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) {
                return this.sendError(res, new Error('User not authenticated'));
            }
            const { id } = req.params;
            const data: UpdateInterviewRequest = req.body;
            const result = await this.service.rescheduleInterview(id as string, data, req.user.id);
            return this.sendSuccess(res, result, 'Interview rescheduled');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Cancel Interview
     */
    cancelInterview = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) {
                return this.sendError(res, new Error('User not authenticated'));
            }
            const { id } = req.params;
            const { reason } = req.body;
            const result = await this.service.cancelInterview(id as string, reason, req.user.id);
            return this.sendSuccess(res, result, 'Interview cancelled');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Submit Feedback
     */
    submitFeedback = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) {
                return this.sendError(res, new Error('User not authenticated'));
            }
            const { id } = req.params;
            const data: SubmitFeedbackRequest = req.body;
            const result = await this.service.submitFeedback(id as string, data, req.user.id, req.user.name);
            return this.sendSuccess(res, result, 'Feedback submitted');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get My Schedule (Placeholder logic)
     */
    getMySchedule = async (req: AuthenticatedRequest, res: Response) => {
        // Logic for retrieving interviewer schedule would go here
        return this.sendSuccess(res, [], 'Feature pending');
    }

    /**
     * Auto Schedule Interviews
     * POST /api/video-interviews/auto-schedule
     */
    autoSchedule = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const data: AutoScheduleRequest = req.body;
            const result = await this.service.autoSchedule(data);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Finalize Interviews
     * POST /api/video-interviews/finalize
     */
    finalizeInterviews = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const data: FinalizeInterviewRequest = req.body;
            const result = await this.service.finalizeInterviews(data, req.user.id);
            return this.sendSuccess(res, result, 'Interviews finalized');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Send Invitation
     * POST /api/video-interviews/:id/send-invitation
     */
    sendInvitation = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const { id } = req.params;
            const data: SendInvitationRequest = req.body;
            const result = await this.service.sendInvitation(id as string, data, req.user.id);
            return this.sendSuccess(res, result, 'Invitation sent');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get Progression Status
     * GET /api/video-interviews/:id/progression-status
     */
    getProgressionStatus = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const { id } = req.params;
            const result = await this.service.getProgressionStatus(id as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get Calendar Events
     * GET /api/video-interviews/job/:jobId/calendar
     */
    getCalendarEvents = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const { jobId } = req.params;
            const result = await this.service.getCalendarEvents(jobId as string);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

}
