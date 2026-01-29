import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { ResumeService } from './resume.service';
import { ResumeRepository } from './resume.repository';
import { AuthenticatedRequest } from '../../types';
import { CreateAnnotationRequest } from './resume.types';

export class ResumeController extends BaseController {
    private service: ResumeService;

    constructor() {
        super('resume');
        this.service = new ResumeService(new ResumeRepository());
    }

    /**
     * Get resume details
     * GET /api/resumes/:resumeId
     */
    getResume = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

            const resumeId = req.params.resumeId as string;
            // Potentially add authorization check here to ensure user can view this resume

            const resume = await this.service.getResume(resumeId);
            return this.sendSuccess(res, resume);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Get annotations for a resume
     * GET /api/resumes/:resumeId/annotations
     */
    getAnnotations = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

            const resumeId = req.params.resumeId as string;
            const annotations = await this.service.getAnnotations(resumeId);
            return this.sendSuccess(res, annotations);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Create a new annotation
     * POST /api/resumes/:resumeId/annotations
     */
    createAnnotation = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

            const resumeId = req.params.resumeId as string;
            const data: CreateAnnotationRequest = req.body;

            const annotation = await this.service.createAnnotation(resumeId, data, {
                id: req.user.id,
                name: req.user.name
            });
            return this.sendSuccess(res, annotation, 'Annotation added successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Delete an annotation
     * DELETE /api/resumes/:resumeId/annotations/:id
     */
    deleteAnnotation = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

            const resumeId = req.params.resumeId as string;
            const id = req.params.id as string;

            await this.service.deleteAnnotation(resumeId, id, req.user.id);
            return this.sendSuccess(res, { success: true }, 'Annotation deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
