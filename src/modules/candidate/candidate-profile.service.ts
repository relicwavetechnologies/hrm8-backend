import { BaseService } from '../../core/service';
import { CandidateRepository } from './candidate.repository';
import { HttpException } from '../../core/http-exception';

export class CandidateProfileService extends BaseService {
    constructor(private repository: CandidateRepository) {
        super();
    }

    // --- Work Experience ---

    async addWorkExperience(candidateId: string, data: any) {
        return this.repository.createWorkExperience(candidateId, data);
    }

    async getWorkExperience(candidateId: string) {
        return this.repository.findWorkExperienceByCandidate(candidateId);
    }

    async updateWorkExperience(candidateId: string, id: string, data: any) {
        const experience = await this.repository.findWorkExperienceById(id);
        if (!experience) throw new HttpException(404, 'Work experience not found');
        if (experience.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized to update this work experience');
        }
        return this.repository.updateWorkExperience(id, data);
    }

    async deleteWorkExperience(candidateId: string, id: string) {
        const experience = await this.repository.findWorkExperienceById(id);
        if (!experience) throw new HttpException(404, 'Work experience not found');
        if (experience.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized to delete this work experience');
        }
        return this.repository.deleteWorkExperience(id);
    }

    // --- Skills ---

    async getSkills(candidateId: string) {
        return this.repository.findSkillsByCandidate(candidateId);
    }

    async updateSkills(candidateId: string, skills: any[]) {
        return this.repository.updateSkills(candidateId, skills);
    }

    // --- Education ---

    async getEducation(candidateId: string) {
        return this.repository.findEducationByCandidate(candidateId);
    }

    async addEducation(candidateId: string, data: any) {
        return this.repository.createEducation(candidateId, data);
    }

    async updateEducation(candidateId: string, id: string, data: any) {
        const item = await this.repository.findEducationById(id);
        if (!item) throw new HttpException(404, 'Education not found');
        if (item.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.updateEducation(id, data);
    }

    async deleteEducation(candidateId: string, id: string) {
        const item = await this.repository.findEducationById(id);
        if (!item) throw new HttpException(404, 'Education not found');
        if (item.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.deleteEducation(id);
    }

    // --- Certifications ---

    async getCertifications(candidateId: string) {
        return this.repository.findCertificationsByCandidate(candidateId);
    }

    async addCertification(candidateId: string, data: any) {
        return this.repository.createCertification(candidateId, data);
    }

    async updateCertification(candidateId: string, id: string, data: any) {
        const item = await this.repository.findCertificationById(id);
        if (!item) throw new HttpException(404, 'Certification not found');
        if (item.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.updateCertification(id, data);
    }

    async deleteCertification(candidateId: string, id: string) {
        const item = await this.repository.findCertificationById(id);
        if (!item) throw new HttpException(404, 'Certification not found');
        if (item.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.deleteCertification(id);
    }

    // --- Training ---

    async getTraining(candidateId: string) {
        return this.repository.findTrainingByCandidate(candidateId);
    }

    async addTraining(candidateId: string, data: any) {
        return this.repository.createTraining(candidateId, data);
    }

    async updateTraining(candidateId: string, id: string, data: any) {
        const item = await this.repository.findTrainingById(id);
        if (!item) throw new HttpException(404, 'Training not found');
        if (item.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.updateTraining(id, data);
    }

    async deleteTraining(candidateId: string, id: string) {
        const item = await this.repository.findTrainingById(id);
        if (!item) throw new HttpException(404, 'Training not found');
        if (item.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.deleteTraining(id);
    }

    // --- Portfolio ---

    async getPortfolio(candidateId: string) {
        return this.repository.findPortfolioByCandidate(candidateId);
    }

    async addPortfolio(candidateId: string, data: any) {
        return this.repository.createPortfolio(candidateId, data);
    }

    async updatePortfolio(candidateId: string, id: string, data: any) {
        const item = await this.repository.findPortfolioById(id);
        if (!item) throw new HttpException(404, 'Portfolio not found');
        if (item.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.updatePortfolio(id, data);
    }

    async deletePortfolio(candidateId: string, id: string) {
        const item = await this.repository.findPortfolioById(id);
        if (!item) throw new HttpException(404, 'Portfolio not found');
        if (item.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.deletePortfolio(id);
    }

    // --- Saved Jobs ---

    async getSavedJobs(candidateId: string) {
        return this.repository.findSavedJobsByCandidate(candidateId);
    }

    async saveJob(candidateId: string, jobId: string) {
        return this.repository.createSavedJob(candidateId, jobId);
    }

    async unsaveJob(candidateId: string, jobId: string) {
        return this.repository.deleteSavedJob(candidateId, jobId);
    }

    // --- Job Alerts ---

    async getJobAlerts(candidateId: string) {
        return this.repository.findJobAlertsByCandidate(candidateId);
    }

    async addJobAlert(candidateId: string, data: any) {
        return this.repository.createJobAlert(candidateId, data);
    }

    async updateJobAlert(candidateId: string, id: string, data: any) {
        // Implementation could check ownership if needed
        return this.repository.updateJobAlert(id, data);
    }

    async deleteJobAlert(candidateId: string, id: string) {
        return this.repository.deleteJobAlert(id);
    }

    // --- Saved Searches ---

    async getSavedSearches(candidateId: string) {
        return this.repository.findSavedSearchesByCandidate(candidateId);
    }

    async addSavedSearch(candidateId: string, data: any) {
        return this.repository.createSavedSearch(candidateId, data);
    }

    async deleteSavedSearch(candidateId: string, id: string) {
        return this.repository.deleteSavedSearch(id);
    }

    // --- Job Invitations ---

    async getJobInvitations(candidateId: string) {
        return this.repository.findJobInvitationsByCandidate(candidateId);
    }

    async respondToInvitation(candidateId: string, token: string, status: 'ACCEPTED' | 'REJECTED') {
        const invitation = await this.repository.findJobInvitationByToken(token);
        if (!invitation) throw new HttpException(404, 'Invitation not found');
        if (invitation.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.updateInvitationStatus(invitation.id, status);
    }

    // --- Resumes ---

    async getResumes(candidateId: string) {
        return this.repository.findResumesByCandidate(candidateId);
    }

    async addResume(candidateId: string, data: any) {
        if (data.is_default) {
            await this.repository.resetDefaultResumes(candidateId);
        }
        return this.repository.createResume(candidateId, data);
    }

    async updateResume(candidateId: string, id: string, data: any) {
        const resume = await this.repository.findResumeById(id);
        if (!resume) throw new HttpException(404, 'Resume not found');
        if (resume.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }

        if (data.is_default && !resume.is_default) {
            await this.repository.resetDefaultResumes(candidateId);
        }

        return this.repository.updateResume(id, data);
    }

    async deleteResume(candidateId: string, id: string) {
        const resume = await this.repository.findResumeById(id);
        if (!resume) throw new HttpException(404, 'Resume not found');
        if (resume.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.deleteResume(id);
    }

    // --- Cover Letters ---

    async getCoverLetters(candidateId: string) {
        return this.repository.findCoverLettersByCandidate(candidateId);
    }

    async addCoverLetter(candidateId: string, data: any) {
        return this.repository.createCoverLetter(candidateId, data);
    }

    async updateCoverLetter(candidateId: string, id: string, data: any) {
        const letter = await this.repository.findCoverLetterById(id);
        if (!letter) throw new HttpException(404, 'Cover letter not found');
        if (letter.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.updateCoverLetter(id, data);
    }

    async deleteCoverLetter(candidateId: string, id: string) {
        const letter = await this.repository.findCoverLetterById(id);
        if (!letter) throw new HttpException(404, 'Cover letter not found');
        if (letter.candidate_id !== candidateId) {
            throw new HttpException(403, 'Unauthorized');
        }
        return this.repository.deleteCoverLetter(id);
    }

    // --- Preferences ---

    async getPreferences(candidateId: string) {
        const candidate = await this.repository.findById(candidateId);
        if (!candidate) throw new HttpException(404, 'Candidate not found');

        return {
            job_type_preference: candidate.job_type_preference,
            salary_preference: candidate.salary_preference,
            relocation_willing: candidate.relocation_willing,
            remote_preference: candidate.remote_preference,
            visa_status: candidate.visa_status,
            work_eligibility: candidate.work_eligibility,
        };
    }

    async updatePreferences(candidateId: string, data: any) {
        return this.repository.updatePreferences(candidateId, data);
    }

    // --- Notification Preferences ---

    async getNotificationPreferences(candidateId: string) {
        let prefs = await this.repository.findNotificationPreferences(candidateId);
        if (!prefs) {
            // Return defaults if not set
            return {
                application_status_changes: true,
                interview_reminders: true,
                job_match_alerts: true,
                messages: true,
                system_updates: true,
                email_enabled: true,
                in_app_enabled: true,
                reminder_hours_before: 24,
            };
        }
        return prefs;
    }

    async updateNotificationPreferences(candidateId: string, data: any) {
        return this.repository.upsertNotificationPreferences(candidateId, data);
    }
}
