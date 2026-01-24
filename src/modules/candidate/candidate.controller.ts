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
}
