import { Request, Response } from 'express';
import { BaseController } from '../../core/controller';
import { ResumeService } from './resume.service';
import { AuthenticatedRequest } from '../../types';

export class ResumeController extends BaseController {
    private resumeService: ResumeService;

    constructor() {
        super('ResumeController');
        this.resumeService = new ResumeService();
    }

    /**
     * GET /api/resumes/:resumeId
     */
    getResume = async (req: Request, res: Response) => {
        try {
            const { resumeId } = req.params as { resumeId: string };
            const resume = await this.resumeService.getResume(resumeId);

            if (!resume) {
                return res.status(404).json({ success: false, error: 'Resume not found' });
            }

            return this.sendSuccess(res, resume);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * GET /api/resumes/:resumeId/annotations
     */
    getAnnotations = async (req: Request, res: Response) => {
        try {
            const { resumeId } = req.params as { resumeId: string };
            const annotations = await this.resumeService.getAnnotations(resumeId);
            return this.sendSuccess(res, annotations);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * POST /api/resumes/:resumeId/annotations
     */
    createAnnotation = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { resumeId } = req.params as { resumeId: string };
            const { user_id, user_name, user_color, type, text, comment, position } = req.body;

            const annotation = await this.resumeService.createAnnotation({
                resume_id: resumeId,
                user_id: user_id || req.user?.id,
                user_name: user_name || (req.user as any)?.name || 'Unknown',
                user_color,
                type,
                text,
                comment,
                position,
            });

            return this.sendSuccess(res, annotation);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * DELETE /api/resumes/:resumeId/annotations/:id
     */
    deleteAnnotation = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params as { id: string };
            const userId = req.body.user_id || req.user?.id;

            if (!userId) {
                return res.status(400).json({ success: false, error: 'User ID required' });
            }

            await this.resumeService.deleteAnnotation(id, userId);
            return this.sendSuccess(res, { deleted: true });
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}

