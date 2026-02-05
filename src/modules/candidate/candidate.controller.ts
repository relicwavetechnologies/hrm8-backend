import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CandidateService } from './candidate.service';
import { CandidateRepository } from './candidate.repository';
import { UnifiedAuthenticatedRequest } from '../../types';
import { getSessionCookieOptions } from '../../utils/session';
import { CloudinaryService } from '../storage/cloudinary.service';

export class CandidateController extends BaseController {
  private candidateService: CandidateService;

  constructor() {
    super();
    this.candidateService = new CandidateService(new CandidateRepository());
  }

  // --- Auth ---
  login = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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

  logout = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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

  register = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const candidate = await this.candidateService.register(req.body);
      const { password_hash, ...candidateData } = candidate;
      return this.sendSuccess(res, { candidate: candidateData });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  verifyEmail = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { token } = req.query;
      if (!token) return this.sendError(res, new Error('Token is required'));
      const result = await this.candidateService.verifyEmail(token as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Profile ---
  getProfile = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const candidateId = req.candidate?.id || req.params.id as string;
      if (!candidateId) return this.sendError(res, new Error('Not authenticated'), 401);

      const candidate = await this.candidateService.getProfile(candidateId);
      const { password_hash, ...candidateData } = candidate;
      return this.sendSuccess(res, { candidate: candidateData });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  me = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    return this.getProfile(req, res);
  };

  updateProfile = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const candidate = await this.candidateService.updateProfile(req.candidate.id, req.body);
      const { password_hash, ...candidateData } = candidate;
      return this.sendSuccess(res, { candidate: candidateData });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updatePassword = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const { currentPassword, newPassword } = req.body;
      await this.candidateService.updatePassword(req.candidate.id, currentPassword, newPassword);
      return this.sendSuccess(res, { message: 'Password updated successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updatePhoto = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const { photoUrl } = req.body;
      const candidate = await this.candidateService.updatePhoto(req.candidate.id, photoUrl);
      const { password_hash, ...candidateData } = candidate;
      return this.sendSuccess(res, { candidate: candidateData }, 'Photo updated successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteAccount = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      await this.candidateService.deleteAccount(req.candidate.id);
      res.clearCookie('candidateSessionId', getSessionCookieOptions());
      return this.sendSuccess(res, { message: 'Account deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  exportData = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const candidateId = req.candidate?.id || req.params.id as string;
      if (!candidateId) return this.sendError(res, new Error('Not authenticated'), 401);

      const data = await this.candidateService.exportData(candidateId);
      return this.sendSuccess(res, data);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Work History ---
  getWorkHistory = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const workHistory = await this.candidateService.getWorkHistory(req.candidate.id);
      return this.sendSuccess(res, workHistory);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addWorkHistory = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const workHistory = await this.candidateService.addWorkHistory(req.candidate.id, req.body);
      return this.sendSuccess(res, workHistory);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateWorkHistory = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = (req.params as any);
      const workHistory = await this.candidateService.updateWorkHistory(id, req.body);
      return this.sendSuccess(res, workHistory);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteWorkHistory = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = (req.params as any);
      await this.candidateService.deleteWorkHistory(id);
      return this.sendSuccess(res, { message: 'Work history deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Education ---
  getEducation = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const education = await this.candidateService.getEducation(req.candidate.id);
      return this.sendSuccess(res, education);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addEducation = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const education = await this.candidateService.addEducation(req.candidate.id, req.body);
      return this.sendSuccess(res, education);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateEducation = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = (req.params as any);
      const education = await this.candidateService.updateEducation(id, req.body);
      return this.sendSuccess(res, education);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteEducation = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      await this.candidateService.deleteEducation(id);
      return this.sendSuccess(res, { message: 'Education deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Skills ---
  getSkills = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const skills = await this.candidateService.getSkills(req.candidate.id);
      return this.sendSuccess(res, skills);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateSkills = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const { skills } = req.body;
      const result = await this.candidateService.updateSkills(req.candidate.id, skills);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Certifications ---
  getCertifications = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const certifications = await this.candidateService.getCertifications(req.candidate.id);
      return this.sendSuccess(res, certifications);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getExpiringCertifications = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const certifications = await this.candidateService.getExpiringCertifications(req.candidate.id);
      return this.sendSuccess(res, certifications);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addCertification = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const certification = await this.candidateService.addCertification(req.candidate.id, req.body);
      return this.sendSuccess(res, certification);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateCertification = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const certification = await this.candidateService.updateCertification(id, req.body);
      return this.sendSuccess(res, certification);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteCertification = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.candidateService.deleteCertification(id);
      return this.sendSuccess(res, { message: 'Certification deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Training ---
  getTraining = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const training = await this.candidateService.getTraining(req.candidate.id);
      return this.sendSuccess(res, training);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addTraining = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const training = await this.candidateService.addTraining(req.candidate.id, req.body);
      return this.sendSuccess(res, training);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateTraining = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const training = await this.candidateService.updateTraining(id, req.body);
      return this.sendSuccess(res, training);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteTraining = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.candidateService.deleteTraining(id);
      return this.sendSuccess(res, { message: 'Training deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Resumes & Cover Letters ---
  getResumes = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const resumes = await this.candidateService.getResumes(req.candidate.id);
      return this.sendSuccess(res, resumes);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addResume = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);

      let resumeData = req.body;

      if (req.file) {
        const uploadResult = await CloudinaryService.uploadMulterFile(req.file, { folder: 'hrm8/resumes' });
        resumeData = {
          ...resumeData,
          file_url: uploadResult.secureUrl,
          file_name: req.file.originalname,
          file_size: uploadResult.bytes,
          file_type: req.file.mimetype,
          public_id: uploadResult.publicId,
        };
      } else if (!resumeData.file_url) {
        return this.sendError(res, new Error('No resume file provided'), 400);
      }

      const resume = await this.candidateService.addResume(req.candidate.id, resumeData);
      return this.sendSuccess(res, resume);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteResume = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.candidateService.deleteResume(id);
      return this.sendSuccess(res, { message: 'Resume deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  setDefaultResume = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const { id } = req.params;
      const result = await this.candidateService.setDefaultResume(req.candidate.id, id);
      return this.sendSuccess(res, result, 'Default resume updated');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCoverLetters = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const coverLetters = await this.candidateService.getCoverLetters(req.candidate.id);
      return this.sendSuccess(res, coverLetters);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addCoverLetter = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);

      let coverLetterData = req.body;

      if (req.file) {
        const uploadResult = await CloudinaryService.uploadMulterFile(req.file, { folder: 'hrm8/cover-letters' });
        coverLetterData = {
          ...coverLetterData,
          file_url: uploadResult.secureUrl,
          file_name: req.file.originalname,
          file_size: uploadResult.bytes,
          file_type: req.file.mimetype,
        };
      }

      const coverLetter = await this.candidateService.addCoverLetter(req.candidate.id, coverLetterData);
      return this.sendSuccess(res, coverLetter);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteCoverLetter = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.candidateService.deleteCoverLetter(id);
      return this.sendSuccess(res, { message: 'Cover letter deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateCoverLetter = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const id = req.params.id as string;
      let coverLetterData = req.body;

      if (req.file) {
        const uploadResult = await CloudinaryService.uploadMulterFile(req.file, { folder: 'hrm8/cover-letters' });
        coverLetterData = {
          ...coverLetterData,
          file_url: uploadResult.secureUrl,
          file_name: req.file.originalname,
          file_size: uploadResult.bytes,
          file_type: req.file.mimetype,
        };
      }

      const coverLetter = await this.candidateService.updateCoverLetter(id, coverLetterData);
      return this.sendSuccess(res, coverLetter, 'Cover letter updated');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Portfolios ---
  getPortfolios = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const portfolios = await this.candidateService.getPortfolios(req.candidate.id);
      return this.sendSuccess(res, portfolios);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addPortfolio = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);

      let portfolioData = req.body;

      if (req.file) {
        const uploadResult = await CloudinaryService.uploadMulterFile(req.file, { folder: 'hrm8/portfolios' });
        portfolioData = {
          ...portfolioData,
          file_url: uploadResult.secureUrl,
          file_name: req.file.originalname,
          file_size: uploadResult.bytes,
          file_type: req.file.mimetype,
        };
      }

      const portfolio = await this.candidateService.addPortfolio(req.candidate.id, portfolioData);
      return this.sendSuccess(res, portfolio);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deletePortfolio = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.candidateService.deletePortfolio(id);
      return this.sendSuccess(res, { message: 'Portfolio item deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updatePortfolio = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const id = req.params.id as string;
      let portfolioData = req.body;

      if (req.file) {
        const uploadResult = await CloudinaryService.uploadMulterFile(req.file, { folder: 'hrm8/portfolios' });
        portfolioData = {
          ...portfolioData,
          file_url: uploadResult.secureUrl,
          file_name: req.file.originalname,
          file_size: uploadResult.bytes,
          file_type: req.file.mimetype,
        };
      }

      const portfolio = await this.candidateService.updatePortfolio(id, portfolioData);
      return this.sendSuccess(res, portfolio, 'Portfolio updated');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Saved Jobs, Searches, Alerts ---
  getSavedJobs = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const savedJobs = await this.candidateService.getSavedJobs(req.candidate.id);
      return this.sendSuccess(res, savedJobs);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  saveJob = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const { jobId } = req.params;
      const savedJob = await this.candidateService.saveJob(req.candidate.id, jobId);
      return this.sendSuccess(res, savedJob);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  unsaveJob = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const { jobId } = req.params;
      await this.candidateService.unsaveJob(req.candidate.id, jobId);
      return this.sendSuccess(res, { message: 'Job unsaved successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getSavedSearches = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const savedSearches = await this.candidateService.getSavedSearches(req.candidate.id);
      return this.sendSuccess(res, savedSearches);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  saveSearch = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const { query, filters } = req.body;
      const savedSearch = await this.candidateService.saveSearch(req.candidate.id, { query, filters });
      return this.sendSuccess(res, savedSearch);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteSavedSearch = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.candidateService.deleteSavedSearch(id);
      return this.sendSuccess(res, { message: 'Saved search deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getJobAlerts = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const jobAlerts = await this.candidateService.getJobAlerts(req.candidate.id);
      return this.sendSuccess(res, jobAlerts);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addJobAlert = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const jobAlert = await this.candidateService.addJobAlert(req.candidate.id, req.body);
      return this.sendSuccess(res, jobAlert);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteJobAlert = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.candidateService.deleteJobAlert(id);
      return this.sendSuccess(res, { message: 'Job alert deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- Recommended Jobs & Resume Parsing ---
  getRecommendedJobs = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const jobs = await this.candidateService.getRecommendedJobs(req.candidate.id);
      return this.sendSuccess(res, jobs);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  parseResume = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'), 401);
      const resumeData = await this.candidateService.parseResume(req.candidate.id, (req as any).file);
      return this.sendSuccess(res, resumeData);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
