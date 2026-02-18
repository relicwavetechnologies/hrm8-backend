"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewController = void 0;
const controller_1 = require("../../core/controller");
const interview_service_1 = require("./interview.service");
class InterviewController extends controller_1.BaseController {
    constructor() {
        super(...arguments);
        this.create = async (req, res) => {
            try {
                const { applicationId, scheduledDate, duration, type, meetingLink, interviewerIds, notes } = req.body;
                const interview = await interview_service_1.InterviewService.createInterview({
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
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.list = async (req, res) => {
            try {
                const { jobId, jobRoundId, status, startDate, endDate } = req.query;
                const interviews = await interview_service_1.InterviewService.getInterviews({
                    jobId: jobId,
                    jobRoundId: jobRoundId,
                    status: status,
                    startDate: startDate ? new Date(startDate) : undefined,
                    endDate: endDate ? new Date(endDate) : undefined,
                });
                return this.sendSuccess(res, { interviews });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.listByJob = async (req, res) => {
            try {
                const jobId = req.params.jobId;
                const interviews = await interview_service_1.InterviewService.getInterviews({ jobId });
                return this.sendSuccess(res, { interviews });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.listByApplication = async (req, res) => {
            try {
                const applicationId = req.params.applicationId;
                const interviews = await interview_service_1.InterviewService.getInterviews({ applicationId });
                return this.sendSuccess(res, { interviews });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getById = async (req, res) => {
            try {
                const id = req.params.id;
                const interview = await interview_service_1.InterviewService.getInterviewById(id);
                if (!interview)
                    return this.sendError(res, new Error('Interview not found'), 404);
                return this.sendSuccess(res, { interview });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.update = async (req, res) => {
            try {
                const id = req.params.id;
                const { interviewerIds, scheduledDate, duration, type, meetingLink, notes } = req.body;
                const interview = await interview_service_1.InterviewService.updateInterview(id, {
                    interviewerIds,
                    scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
                    duration,
                    type,
                    meetingLink,
                    notes,
                });
                return this.sendSuccess(res, { interview, message: 'Interview updated successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateStatus = async (req, res) => {
            try {
                const id = req.params.id;
                const { status, notes } = req.body;
                const interview = await interview_service_1.InterviewService.updateStatus(id, status, notes);
                return this.sendSuccess(res, { interview });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.addFeedback = async (req, res) => {
            try {
                const id = req.params.id;
                const feedback = req.body; // Expects interviewer_id, overall_rating, etc.
                const interview = await interview_service_1.InterviewService.addFeedback(id, feedback);
                return this.sendSuccess(res, { interview });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getProgressionStatus = async (req, res) => {
            try {
                const id = req.params.id;
                const status = await interview_service_1.InterviewService.getProgressionStatus(id);
                return this.sendSuccess(res, status);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.InterviewController = InterviewController;
