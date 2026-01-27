import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CandidateProfileService } from './candidate-profile.service';
import { CandidateRepository } from './candidate.repository';
import { CandidateAuthenticatedRequest } from '../../types';

export class CandidateDocumentController extends BaseController {
    private profileService: CandidateProfileService;

    constructor() {
        super();
        this.profileService = new CandidateProfileService(new CandidateRepository());
    }

    // --- Resumes ---

    getResumes = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const resumes = await this.profileService.getResumes(req.candidate.id);
            return this.sendSuccess(res, resumes);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    addResume = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const resume = await this.profileService.addResume(req.candidate.id, req.body);
            return this.sendSuccess(res, resume, 'Resume added successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateResume = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const resume = await this.profileService.updateResume(
                req.candidate.id,
                req.params.id as string,
                req.body
            );
            return this.sendSuccess(res, resume, 'Resume updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteResume = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            await this.profileService.deleteResume(req.candidate.id, req.params.id as string);
            return this.sendSuccess(res, null, 'Resume deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // --- Cover Letters ---

    getCoverLetters = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const letters = await this.profileService.getCoverLetters(req.candidate.id);
            return this.sendSuccess(res, letters);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    addCoverLetter = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const letter = await this.profileService.addCoverLetter(req.candidate.id, req.body);
            return this.sendSuccess(res, letter, 'Cover letter added successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateCoverLetter = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const letter = await this.profileService.updateCoverLetter(
                req.candidate.id,
                req.params.id as string,
                req.body
            );
            return this.sendSuccess(res, letter, 'Cover letter updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteCoverLetter = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            await this.profileService.deleteCoverLetter(req.candidate.id, req.params.id as string);
            return this.sendSuccess(res, null, 'Cover letter deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
