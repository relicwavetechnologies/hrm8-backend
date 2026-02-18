"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeController = void 0;
const controller_1 = require("../../core/controller");
const resume_service_1 = require("./resume.service");
class ResumeController extends controller_1.BaseController {
    constructor() {
        super('ResumeController');
        /**
         * GET /api/resumes/:resumeId
         */
        this.getResume = async (req, res) => {
            try {
                const { resumeId } = req.params;
                const resume = await this.resumeService.getResume(resumeId);
                if (!resume) {
                    return res.status(404).json({ success: false, error: 'Resume not found' });
                }
                return this.sendSuccess(res, resume);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * GET /api/resumes/:resumeId/annotations
         */
        this.getAnnotations = async (req, res) => {
            try {
                const { resumeId } = req.params;
                const annotations = await this.resumeService.getAnnotations(resumeId);
                return this.sendSuccess(res, annotations);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * POST /api/resumes/:resumeId/annotations
         */
        this.createAnnotation = async (req, res) => {
            try {
                const { resumeId } = req.params;
                const { user_id, user_name, user_color, type, text, comment, position } = req.body;
                const annotation = await this.resumeService.createAnnotation({
                    resume_id: resumeId,
                    user_id: user_id || req.user?.id,
                    user_name: user_name || req.user?.name || 'Unknown',
                    user_color,
                    type,
                    text,
                    comment,
                    position,
                });
                return this.sendSuccess(res, annotation);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * DELETE /api/resumes/:resumeId/annotations/:id
         */
        this.deleteAnnotation = async (req, res) => {
            try {
                const { id } = req.params;
                const userId = req.body.user_id || req.user?.id;
                if (!userId) {
                    return res.status(400).json({ success: false, error: 'User ID required' });
                }
                await this.resumeService.deleteAnnotation(id, userId);
                return this.sendSuccess(res, { deleted: true });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.resumeService = new resume_service_1.ResumeService();
    }
}
exports.ResumeController = ResumeController;
