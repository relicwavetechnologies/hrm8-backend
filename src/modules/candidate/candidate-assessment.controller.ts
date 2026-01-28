import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AssessmentService } from '../assessment/assessment.service';
import { AssessmentRepository } from '../assessment/assessment.repository';
import { CandidateAuthenticatedRequest } from '../../types';

export class CandidateAssessmentController extends BaseController {
    private service: AssessmentService;

    constructor() {
        super('candidate-assessment');
        this.service = new AssessmentService(new AssessmentRepository());
    }

    getAssessments = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) throw new Error('Unauthorized');
            const result = await this.service.getCandidateAssessments(req.candidate.id);
            return this.sendSuccess(res, { assessments: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    getAssessmentDetails = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) throw new Error('Unauthorized');
            const id = req.params.id as string;
            const result = await this.service.getAssessmentDetailsForCandidate(id, req.candidate.id);
            return this.sendSuccess(res, { assessment: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    startAssessment = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) throw new Error('Unauthorized');
            const id = req.params.id as string;
            const result = await this.service.startAssessmentForCandidate(id, req.candidate.id);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    submitAssessment = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) throw new Error('Unauthorized');
            const id = req.params.id as string;
            const { answers } = req.body;
            const result = await this.service.submitAssessmentForCandidate(id, req.candidate.id, answers);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }
}
