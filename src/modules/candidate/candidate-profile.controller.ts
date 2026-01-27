import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CandidateProfileService } from './candidate-profile.service';
import { CandidateRepository } from './candidate.repository';
import { CandidateAuthenticatedRequest } from '../../types';

export class CandidateProfileController extends BaseController {
    private profileService: CandidateProfileService;

    constructor() {
        super();
        this.profileService = new CandidateProfileService(new CandidateRepository());
    }

    // Work Experience
    getWorkExperience = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const experience = await this.profileService.getWorkExperience(req.candidate.id);
            return this.sendSuccess(res, experience);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    addWorkExperience = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const experience = await this.profileService.addWorkExperience(req.candidate.id, req.body);
            return this.sendSuccess(res, experience, 'Work experience added successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateWorkExperience = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const experience = await this.profileService.updateWorkExperience(
                req.candidate.id,
                req.params.id as string,
                req.body
            );
            return this.sendSuccess(res, experience, 'Work experience updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteWorkExperience = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            await this.profileService.deleteWorkExperience(req.candidate.id, req.params.id as string);
            return this.sendSuccess(res, null, 'Work experience deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // Skills
    getSkills = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const skills = await this.profileService.getSkills(req.candidate.id);
            return this.sendSuccess(res, skills);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateSkills = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const { skills } = req.body;
            const updatedSkills = await this.profileService.updateSkills(req.candidate.id, skills);
            return this.sendSuccess(res, updatedSkills, 'Skills updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // --- Education ---

    getEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const education = await this.profileService.getEducation(req.candidate.id);
            return this.sendSuccess(res, education);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    addEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const education = await this.profileService.addEducation(req.candidate.id, req.body);
            return this.sendSuccess(res, education, 'Education added successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const education = await this.profileService.updateEducation(
                req.candidate.id,
                req.params.id as string,
                req.body
            );
            return this.sendSuccess(res, education, 'Education updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteEducation = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            await this.profileService.deleteEducation(req.candidate.id, req.params.id as string);
            return this.sendSuccess(res, null, 'Education deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // --- Certifications ---

    getCertifications = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const certifications = await this.profileService.getCertifications(req.candidate.id);
            return this.sendSuccess(res, certifications);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    addCertification = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const certification = await this.profileService.addCertification(req.candidate.id, req.body);
            return this.sendSuccess(res, certification, 'Certification added successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateCertification = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const certification = await this.profileService.updateCertification(
                req.candidate.id,
                req.params.id as string,
                req.body
            );
            return this.sendSuccess(res, certification, 'Certification updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteCertification = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            await this.profileService.deleteCertification(req.candidate.id, req.params.id as string);
            return this.sendSuccess(res, null, 'Certification deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // --- Training ---

    getTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const training = await this.profileService.getTraining(req.candidate.id);
            return this.sendSuccess(res, training);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    addTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const training = await this.profileService.addTraining(req.candidate.id, req.body);
            return this.sendSuccess(res, training, 'Training added successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const training = await this.profileService.updateTraining(
                req.candidate.id,
                req.params.id as string,
                req.body
            );
            return this.sendSuccess(res, training, 'Training updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteTraining = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            await this.profileService.deleteTraining(req.candidate.id, req.params.id as string);
            return this.sendSuccess(res, null, 'Training deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // --- Portfolio ---

    getPortfolio = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const portfolio = await this.profileService.getPortfolio(req.candidate.id);
            return this.sendSuccess(res, portfolio);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    addPortfolio = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const portfolio = await this.profileService.addPortfolio(req.candidate.id, req.body);
            return this.sendSuccess(res, portfolio, 'Portfolio added successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updatePortfolio = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const portfolio = await this.profileService.updatePortfolio(
                req.candidate.id,
                req.params.id as string,
                req.body
            );
            return this.sendSuccess(res, portfolio, 'Portfolio updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deletePortfolio = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            await this.profileService.deletePortfolio(req.candidate.id, req.params.id as string);
            return this.sendSuccess(res, null, 'Portfolio deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // --- Saved Jobs ---

    getSavedJobs = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const jobs = await this.profileService.getSavedJobs(req.candidate.id);
            return this.sendSuccess(res, jobs);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    saveJob = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const { jobId } = req.body;
            const savedJob = await this.profileService.saveJob(req.candidate.id, jobId);
            return this.sendSuccess(res, savedJob, 'Job saved successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    unsaveJob = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const jobId = req.params.jobId as string;
            await this.profileService.unsaveJob(req.candidate.id, jobId);
            return this.sendSuccess(res, null, 'Job unsaved successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // --- Job Alerts ---

    getJobAlerts = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const alerts = await this.profileService.getJobAlerts(req.candidate.id);
            return this.sendSuccess(res, alerts);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    addJobAlert = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const alert = await this.profileService.addJobAlert(req.candidate.id, req.body);
            return this.sendSuccess(res, alert, 'Job alert created successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateJobAlert = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const alert = await this.profileService.updateJobAlert(
                req.candidate.id,
                req.params.id as string,
                req.body
            );
            return this.sendSuccess(res, alert, 'Job alert updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteJobAlert = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            await this.profileService.deleteJobAlert(req.candidate.id, req.params.id as string);
            return this.sendSuccess(res, null, 'Job alert deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // --- Saved Searches ---

    getSavedSearches = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const searches = await this.profileService.getSavedSearches(req.candidate.id);
            return this.sendSuccess(res, searches);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    addSavedSearch = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const search = await this.profileService.addSavedSearch(req.candidate.id, req.body);
            return this.sendSuccess(res, search, 'Search saved successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteSavedSearch = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            await this.profileService.deleteSavedSearch(req.candidate.id, req.params.id as string);
            return this.sendSuccess(res, null, 'Saved search deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // --- Job Invitations ---

    getJobInvitations = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const invitations = await this.profileService.getJobInvitations(req.candidate.id);
            return this.sendSuccess(res, invitations);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    respondToInvitation = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const { token, status } = req.body;
            const result = await this.profileService.respondToInvitation(req.candidate.id, token, status);
            return this.sendSuccess(res, result, `Invitation ${status.toLowerCase()} successfully`);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // --- Preferences ---

    getPreferences = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const preferences = await this.profileService.getPreferences(req.candidate.id);
            return this.sendSuccess(res, preferences);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updatePreferences = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const preferences = await this.profileService.updatePreferences(req.candidate.id, req.body);
            return this.sendSuccess(res, preferences, 'Preferences updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // --- Notification Preferences ---

    getNotificationPreferences = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const preferences = await this.profileService.getNotificationPreferences(req.candidate.id);
            return this.sendSuccess(res, preferences);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateNotificationPreferences = async (req: CandidateAuthenticatedRequest, res: Response) => {
        try {
            if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
            const preferences = await this.profileService.updateNotificationPreferences(
                req.candidate.id,
                req.body
            );
            return this.sendSuccess(res, preferences, 'Notification preferences updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
