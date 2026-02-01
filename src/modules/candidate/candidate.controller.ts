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
      const docs = await repo.getDocuments(req.candidate.id);

      const mappedResumes = docs.resumes.map((resume: any) => ({
        id: resume.id,
        fileName: resume.file_name,
        fileUrl: resume.file_url,
        fileSize: resume.file_size,
        fileType: resume.file_type,
        isDefault: resume.is_default,
        uploadedAt: resume.uploaded_at,
        version: resume.version
      }));

      const mappedCoverLetters = docs.coverLetters.map((cl: any) => ({
        id: cl.id,
        title: cl.title,
        content: cl.content,
        fileUrl: cl.file_url,
        fileName: cl.file_name,
        fileSize: cl.file_size,
        fileType: cl.file_type,
        isTemplate: cl.is_template,
        isDraft: cl.is_draft,
        createdAt: cl.created_at,
        updatedAt: cl.updated_at
      }));

      const mappedPortfolios = docs.portfolios.map((p: any) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        fileUrl: p.file_url,
        fileName: p.file_name,
        fileSize: p.file_size,
        fileType: p.file_type,
        externalUrl: p.external_url,
        platform: p.platform,
        description: p.description,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));

      return this.sendSuccess(res, {
        documents: {
          resumes: mappedResumes,
          coverLetters: mappedCoverLetters,
          portfolios: mappedPortfolios
        }
      });
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
      const quals = await repo.getQualifications(req.candidate.id);

      const mappedEducation = quals.education.map((e: any) => ({
        id: e.id,
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        startDate: e.start_date,
        endDate: e.end_date,
        current: e.current,
        grade: e.grade,
        description: e.description,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      }));

      const mappedCertifications = quals.certifications.map((c: any) => ({
        id: c.id,
        name: c.name,
        issuingOrg: c.issuing_org,
        issueDate: c.issue_date,
        expiryDate: c.expiry_date,
        credentialId: c.credential_id,
        credentialUrl: c.credential_url,
        doesNotExpire: c.does_not_expire,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }));

      const mappedTraining = quals.training.map((t: any) => ({
        id: t.id,
        courseName: t.course_name,
        provider: t.provider,
        completedDate: t.completed_date,
        duration: t.duration,
        description: t.description,
        certificateUrl: t.certificate_url,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      }));

      return this.sendSuccess(res, {
        qualifications: {
          education: mappedEducation,
          certifications: mappedCertifications,
          training: mappedTraining
        }
      });
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
      const workExperience = await this.candidateService.getWorkHistory(req.candidate.id);
      return this.sendSuccess(res, workExperience);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createWorkHistory = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const experience = await this.candidateService.createWorkExperience(req.candidate.id, req.body);
      return this.sendSuccess(res, experience);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateWorkHistory = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      let result;

      if (id) {
        // Single update
        result = await this.candidateService.updateWorkExperienceItem(id, req.body);
      } else {
        // Bulk update
        result = await this.candidateService.updateWorkHistory(req.candidate.id, req.body);
      }

      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteWorkHistory = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = req.params.id;
      await this.candidateService.deleteWorkExperience(id);
      return this.sendSuccess(res, { message: 'Experience deleted' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Notification Preferences
  getNotificationPreferences = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const preferences = await this.candidateService.getNotificationPreferences(req.candidate.id);
      return this.sendSuccess(res, preferences);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateNotificationPreferences = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const preferences = await this.candidateService.updateNotificationPreferences(req.candidate.id, req.body);
      return this.sendSuccess(res, { preferences });
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
      const skills = await this.candidateService.updateSkills(req.candidate.id, req.body);
      return this.sendSuccess(res, skills);
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

  removeSavedJob = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.candidateService.removeSavedJob(req.candidate.id, id);
      return this.sendSuccess(res, { message: 'Job removed from saved' });
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

  deleteSavedSearch = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.candidateService.deleteSavedSearch(id);
      return this.sendSuccess(res, { message: 'Search deleted' });
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

  createJobAlert = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const alert = await this.candidateService.createJobAlert(req.candidate.id, req.body);
      res.status(201);
      return this.sendSuccess(res, { alert });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateJobAlert = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const alert = await this.candidateService.updateJobAlert(id, req.body);
      return this.sendSuccess(res, { alert });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteJobAlert = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.candidateService.deleteJobAlert(id);
      return this.sendSuccess(res, { message: 'Job alert deleted' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Qualifications - Education
  getEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const education = await this.candidateService.getEducation(req.candidate.id);
      return this.sendSuccess(res, education);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const education = await this.candidateService.createEducation(req.candidate.id, req.body);
      res.status(201);
      return this.sendSuccess(res, { education });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const education = await this.candidateService.updateEducation(id, req.body);
      return this.sendSuccess(res, { education });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.candidateService.deleteEducation(id);
      return this.sendSuccess(res, { message: 'Education deleted' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Qualifications - Certifications
  getCertifications = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const certifications = await this.candidateService.getCertifications(req.candidate.id);
      return this.sendSuccess(res, certifications);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getExpiringCertifications = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const certifications = await this.candidateService.getCertifications(req.candidate.id);
      const now = new Date();
      const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const expiring = certifications.filter((cert: any) => {
        if (!cert.expiry_date || cert.does_not_expire) return false;
        const expiry = new Date(cert.expiry_date);
        return expiry <= threeMonthsFromNow && expiry > now;
      });

      return this.sendSuccess(res, expiring);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createCertification = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const certification = await this.candidateService.createCertification(req.candidate.id, req.body);
      res.status(201);
      return this.sendSuccess(res, { certification });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateCertification = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const certification = await this.candidateService.updateCertification(id, req.body);
      return this.sendSuccess(res, { certification });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteCertification = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.candidateService.deleteCertification(id);
      return this.sendSuccess(res, { message: 'Certification deleted' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Qualifications - Training
  getTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const training = await this.candidateService.getTraining(req.candidate.id);
      return this.sendSuccess(res, training);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const training = await this.candidateService.createTraining(req.candidate.id, req.body);
      res.status(201);
      return this.sendSuccess(res, { training });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const training = await this.candidateService.updateTraining(id, req.body);
      return this.sendSuccess(res, { training });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.candidateService.deleteTraining(id);
      return this.sendSuccess(res, { message: 'Training deleted' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
