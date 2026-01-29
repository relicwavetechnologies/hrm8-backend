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

  // Work History
  getWorkHistory = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const workHistory = await this.candidateService.getWorkHistory(req.candidate.id);
      return this.sendSuccess(res, workHistory);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addWorkHistory = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const workHistory = await this.candidateService.addWorkHistory(req.candidate.id, req.body);
      return this.sendSuccess(res, workHistory);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateWorkHistory = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const workHistory = await this.candidateService.updateWorkHistory(id, req.body);
      return this.sendSuccess(res, workHistory);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteWorkHistory = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      await this.candidateService.deleteWorkHistory(id);
      return this.sendSuccess(res, { message: 'Work history deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Education
  getEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const education = await this.candidateService.getEducation(req.candidate.id);
      return this.sendSuccess(res, education);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const education = await this.candidateService.addEducation(req.candidate.id, req.body);
      return this.sendSuccess(res, education);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const education = await this.candidateService.updateEducation(id, req.body);
      return this.sendSuccess(res, education);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      await this.candidateService.deleteEducation(id);
      return this.sendSuccess(res, { message: 'Education deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Skills
  getSkills = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const skills = await this.candidateService.getSkills(req.candidate.id);
      return this.sendSuccess(res, skills);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateSkills = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { skills } = req.body;
      const result = await this.candidateService.updateSkills(req.candidate.id, skills);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Certifications
  getCertifications = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const certifications = await this.candidateService.getCertifications(req.candidate.id);
      return this.sendSuccess(res, certifications);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addCertification = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const certification = await this.candidateService.addCertification(req.candidate.id, req.body);
      return this.sendSuccess(res, certification);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateCertification = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const certification = await this.candidateService.updateCertification(id, req.body);
      return this.sendSuccess(res, certification);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteCertification = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      await this.candidateService.deleteCertification(id);
      return this.sendSuccess(res, { message: 'Certification deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Training
  getTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const training = await this.candidateService.getTraining(req.candidate.id);
      return this.sendSuccess(res, training);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const training = await this.candidateService.addTraining(req.candidate.id, req.body);
      return this.sendSuccess(res, training);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      const training = await this.candidateService.updateTraining(id, req.body);
      return this.sendSuccess(res, training);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      await this.candidateService.deleteTraining(id);
      return this.sendSuccess(res, { message: 'Training deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Resumes
  getResumes = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const resumes = await this.candidateService.getResumes(req.candidate.id);
      return this.sendSuccess(res, resumes);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addResume = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const resume = await this.candidateService.addResume(req.candidate.id, req.body);
      return this.sendSuccess(res, resume);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteResume = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      await this.candidateService.deleteResume(id);
      return this.sendSuccess(res, { message: 'Resume deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Cover Letters
  getCoverLetters = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const coverLetters = await this.candidateService.getCoverLetters(req.candidate.id);
      return this.sendSuccess(res, coverLetters);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addCoverLetter = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const coverLetter = await this.candidateService.addCoverLetter(req.candidate.id, req.body);
      return this.sendSuccess(res, coverLetter);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteCoverLetter = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      await this.candidateService.deleteCoverLetter(id);
      return this.sendSuccess(res, { message: 'Cover letter deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Portfolios
  getPortfolios = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const portfolios = await this.candidateService.getPortfolios(req.candidate.id);
      return this.sendSuccess(res, portfolios);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addPortfolio = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const portfolio = await this.candidateService.addPortfolio(req.candidate.id, req.body);
      return this.sendSuccess(res, portfolio);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deletePortfolio = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      await this.candidateService.deletePortfolio(id);
      return this.sendSuccess(res, { message: 'Portfolio item deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Saved Jobs
  getSavedJobs = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const savedJobs = await this.candidateService.getSavedJobs(req.candidate.id);
      return this.sendSuccess(res, savedJobs);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  saveJob = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { jobId } = req.params as { jobId: string };
      const savedJob = await this.candidateService.saveJob(req.candidate.id, jobId);
      return this.sendSuccess(res, savedJob);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  unsaveJob = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { jobId } = req.params as { jobId: string };
      await this.candidateService.unsaveJob(req.candidate.id, jobId);
      return this.sendSuccess(res, { message: 'Job unsaved successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Saved Searches
  getSavedSearches = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const savedSearches = await this.candidateService.getSavedSearches(req.candidate.id);
      return this.sendSuccess(res, savedSearches);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  saveSearch = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { query, filters } = req.body;
      const savedSearch = await this.candidateService.saveSearch(req.candidate.id, { query, filters });
      return this.sendSuccess(res, savedSearch);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteSavedSearch = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      await this.candidateService.deleteSavedSearch(id);
      return this.sendSuccess(res, { message: 'Saved search deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Job Alerts
  getJobAlerts = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const jobAlerts = await this.candidateService.getJobAlerts(req.candidate.id);
      return this.sendSuccess(res, jobAlerts);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addJobAlert = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const jobAlert = await this.candidateService.addJobAlert(req.candidate.id, req.body);
      return this.sendSuccess(res, jobAlert);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteJobAlert = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      await this.candidateService.deleteJobAlert(id);
      return this.sendSuccess(res, { message: 'Job alert deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Recommended Jobs
  getRecommendedJobs = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const jobs = await this.candidateService.getRecommendedJobs(req.candidate.id);
      return this.sendSuccess(res, jobs);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Resume Parsing
  parseResume = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const resumeData = await this.candidateService.parseResume(req.candidate.id, (req as any).file);
      return this.sendSuccess(res, resumeData);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

}
