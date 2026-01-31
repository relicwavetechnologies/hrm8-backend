import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CandidateService } from './candidate.service';
import { CandidateRepository } from './candidate.repository';
import { CandidateAuthenticatedRequest } from '../../types';
import { getSessionCookieOptions } from '../../utils/session';

export class CandidateController extends BaseController {
  private candidateService: CandidateService;

  constructor() {
    super();
    this.candidateService = new CandidateService(new CandidateRepository());
  }

  // Auth
  login = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      const { email, password } = req.body;
      const { candidate, sessionId } = await this.candidateService.login({ email, password });
      
      res.cookie('candidateSessionId', sessionId, getSessionCookieOptions());
      
      const { password_hash, ...candidateData } = candidate;
      return this.sendSuccess(res, { candidate: candidateData });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  logout = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.cookies?.candidateSessionId;
      if (sessionId) {
        await this.candidateService.logout(sessionId);
      }
      res.clearCookie('candidateSessionId', getSessionCookieOptions());
      return this.sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  register = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      const candidate = await this.candidateService.register(req.body);
      const { password_hash, ...candidateData } = candidate;
      res.status(201);
      return this.sendSuccess(res,
        { candidate: candidateData, message: 'Please check your email to verify your account' }
      );
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  verifyEmail = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      const { token } = req.query;
      if (!token) {
        return this.sendError(res, new Error('Verification token is required'));
      }

      const { candidate, sessionId } = await this.candidateService.verifyEmail(token as string);
      res.cookie('candidateSessionId', sessionId, getSessionCookieOptions());

      const { password_hash, ...candidateData } = candidate;
      return this.sendSuccess(res, {
        candidate: candidateData,
        message: 'Email verified successfully'
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCurrentCandidate = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const candidate = await this.candidateService.getCurrentCandidate(req.candidate.id);
      const { password_hash, ...candidateData } = candidate;
      return this.sendSuccess(res, { candidate: candidateData });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Profile
  getProfile = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const candidate = await this.candidateService.getProfile(req.candidate.id);
      const { password_hash, ...candidateData } = candidate;
      return this.sendSuccess(res, { candidate: candidateData });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateProfile = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const candidate = await this.candidateService.updateProfile(req.candidate.id, req.body);
      const { password_hash, ...candidateData } = candidate;
      return this.sendSuccess(res, { candidate: candidateData });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updatePassword = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { currentPassword, newPassword } = req.body;
      await this.candidateService.updatePassword(req.candidate.id, currentPassword, newPassword);
      return this.sendSuccess(res, { message: 'Password updated successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Assessment Methods
  getAssessments = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const assessments = await this.candidateService.getAssessments(req.candidate.id);
      return this.sendSuccess(res, { assessments });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getAssessment = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const assessment = await this.candidateService.getAssessmentDetails(req.candidate.id, id);
      return this.sendSuccess(res, { assessment });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  startAssessment = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.candidateService.startAssessment(req.candidate.id, id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  submitAssessment = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { answers } = req.body;
      const result = await this.candidateService.submitAssessment(req.candidate.id, id, answers);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getDocuments = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const repo = new CandidateRepository();
      const documents = await repo.getDocuments(req.candidate.id);
      return this.sendSuccess(res, { documents });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateDocuments = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const updates = await this.candidateService.updateDocuments(req.candidate.id, req.body);
      return this.sendSuccess(res, { documents: updates, message: 'Documents updated successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getQualifications = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const repo = new CandidateRepository();
      const qualifications = await repo.getQualifications(req.candidate.id);
      return this.sendSuccess(res, { qualifications });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateQualifications = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const updates = await this.candidateService.updateQualifications(req.candidate.id, req.body);
      return this.sendSuccess(res, { qualifications: updates, message: 'Qualifications updated successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getWorkHistory = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const repo = new CandidateRepository();
      const workHistory = await repo.getWorkHistory(req.candidate.id);
      return this.sendSuccess(res, { workHistory });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateWorkHistory = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const updates = await this.candidateService.updateWorkHistory(req.candidate.id, req.body);
      return this.sendSuccess(res, { ...updates, message: 'Work history updated successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
