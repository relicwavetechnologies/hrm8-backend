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

    getResume = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
            const resumeId = req.params.resumeId as string;
            const resume = await this.service.getResume(resumeId);
            return this.sendSuccess(res, resume);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

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
