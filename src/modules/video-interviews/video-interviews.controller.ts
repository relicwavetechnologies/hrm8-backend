import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { VideoInterviewService } from './video-interviews.service';
import { VideoInterviewRepository } from './video-interviews.repository';
import { AuthenticatedRequest } from '../../types';
import {
    CreateInterviewRequest,
    UpdateInterviewRequest,
    SubmitFeedbackRequest
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
}
