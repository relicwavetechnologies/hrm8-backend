"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentController = void 0;
const controller_1 = require("../../core/controller");
const assessment_service_1 = require("./assessment.service");
const assessment_repository_1 = require("./assessment.repository");
class AssessmentController extends controller_1.BaseController {
    constructor() {
        super();
        this.getAssessmentByToken = async (req, res) => {
            try {
                const { token } = req.params;
                const data = await this.assessmentService.getAssessmentByToken(token);
                return this.sendSuccess(res, { assessment: data });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.startAssessment = async (req, res) => {
            try {
                const { token } = req.params;
                await this.assessmentService.startAssessment(token);
                return this.sendSuccess(res, { message: 'Assessment started' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.saveResponse = async (req, res) => {
            try {
                const { token } = req.params;
                const { questionId, response } = req.body;
                if (!questionId) {
                    return this.sendError(res, new Error('questionId is required'), 400);
                }
                await this.assessmentService.saveResponse(token, questionId, response);
                return this.sendSuccess(res, { message: 'Response saved' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.submitAssessment = async (req, res) => {
            try {
                const { token } = req.params;
                const { responses } = req.body;
                await this.assessmentService.submitAssessment(token, responses);
                return this.sendSuccess(res, { message: 'Assessment submitted' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getGrading = async (req, res) => {
            try {
                const { id } = req.params;
                const data = await this.assessmentService.getGradingDetails(id);
                return this.sendSuccess(res, data);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.saveGrade = async (req, res) => {
            try {
                const { id } = req.params;
                const { grades } = req.body;
                const graderId = req.user?.id || 'system';
                await this.assessmentService.saveGrade(id, grades, graderId);
                return this.sendSuccess(res, { message: 'Grades saved successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.saveVote = async (req, res) => {
            try {
                const { id } = req.params;
                const { vote, comment } = req.body;
                const userId = req.user?.id;
                if (!userId)
                    return this.sendError(res, new Error('User not authenticated'), 401);
                if (!vote || !['APPROVE', 'REJECT'].includes(vote)) {
                    return this.sendError(res, new Error('vote must be APPROVE or REJECT'), 400);
                }
                await this.assessmentService.saveVote(id, vote, comment, userId);
                return this.sendSuccess(res, { message: 'Vote saved successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.saveComment = async (req, res) => {
            try {
                const { id } = req.params;
                const { comment } = req.body;
                const userId = req.user?.id || 'system';
                await this.assessmentService.addComment(id, comment, userId);
                return this.sendSuccess(res, { message: 'Comment added' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.finalizeAssessment = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.assessmentService.finalizeAssessment(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.resendInvitation = async (req, res) => {
            try {
                const { id } = req.params;
                await this.assessmentService.resendInvitation(id);
                return this.sendSuccess(res, { message: 'Invitation resent' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.inviteCandidate = async (req, res) => {
            try {
                const { applicationId, jobRoundId } = req.body;
                if (!applicationId || !jobRoundId) {
                    return this.sendError(res, new Error('applicationId and jobRoundId are required'), 400);
                }
                const userId = req.user?.id;
                if (!userId) {
                    return this.sendError(res, new Error('User not authenticated'), 401);
                }
                const result = await this.assessmentService.manualInviteToAssessment(applicationId, jobRoundId, userId);
                if (!result.success) {
                    return this.sendError(res, new Error(result.error || 'Failed to invite'), 400);
                }
                return this.sendSuccess(res, { message: 'Invitation sent successfully', assessmentId: result.assessmentId });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.assessmentService = new assessment_service_1.AssessmentService(new assessment_repository_1.AssessmentRepository());
    }
}
exports.AssessmentController = AssessmentController;
