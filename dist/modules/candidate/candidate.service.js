"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateService = void 0;
const service_1 = require("../../core/service");
const client_1 = require("@prisma/client");
const password_1 = require("../../utils/password");
const email_1 = require("../../utils/email");
const http_exception_1 = require("../../core/http-exception");
const session_1 = require("../../utils/session");
const token_1 = require("../../utils/token");
const email_service_1 = require("../email/email.service");
class CandidateService extends service_1.BaseService {
    constructor(candidateRepository) {
        super();
        this.candidateRepository = candidateRepository;
    }
    async login(data) {
        const candidate = await this.candidateRepository.findByEmail((0, email_1.normalizeEmail)(data.email));
        if (!candidate) {
            throw new http_exception_1.HttpException(401, 'Invalid credentials');
        }
        const isValid = await (0, password_1.comparePassword)(data.password, candidate.password_hash);
        if (!isValid) {
            throw new http_exception_1.HttpException(401, 'Invalid credentials');
        }
        if (candidate.status !== 'ACTIVE') {
            throw new http_exception_1.HttpException(403, `Account status: ${candidate.status}`);
        }
        // Update last login
        await this.candidateRepository.updateLastLogin(candidate.id);
        // Create session
        const sessionId = (0, session_1.generateSessionId)();
        const expiresAt = (0, session_1.getSessionExpiration)();
        await this.candidateRepository.createSession({
            session_id: sessionId,
            candidate: { connect: { id: candidate.id } },
            email: candidate.email,
            expires_at: expiresAt,
        });
        return { candidate, sessionId };
    }
    async logout(sessionId) {
        await this.candidateRepository.deleteSession(sessionId);
    }
    async register(data) {
        const email = (0, email_1.normalizeEmail)(data.email);
        const exists = await this.candidateRepository.findByEmail(email);
        if (exists) {
            throw new http_exception_1.HttpException(409, 'Candidate with this email already exists');
        }
        const passwordHash = await (0, password_1.hashPassword)(data.password);
        const candidate = await this.candidateRepository.create({
            email,
            first_name: data.firstName,
            last_name: data.lastName,
            password_hash: passwordHash,
            phone: data.phone,
            status: 'PENDING_VERIFICATION',
        });
        // Generate and send verification token
        const token = (0, token_1.generateToken)();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await this.candidateRepository.createVerificationToken({
            candidate: { connect: { id: candidate.id } },
            email: candidate.email,
            token,
            expires_at: expiresAt,
        });
        // Send verification email
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
        try {
            await email_service_1.emailService.sendCandidateVerificationEmail({
                to: candidate.email,
                name: candidate.first_name || 'User',
                verificationUrl,
            });
        }
        catch (error) {
            console.error('Failed to send verification email:', error);
            // Don't throw error, user can resend
        }
        return candidate;
    }
    async getProfile(id) {
        const candidate = await this.candidateRepository.findById(id);
        if (!candidate)
            throw new http_exception_1.HttpException(404, 'Candidate not found');
        return candidate;
    }
    async updateProfile(id, data) {
        return this.candidateRepository.update(id, data);
    }
    async updatePassword(id, current, newPass) {
        const candidate = await this.candidateRepository.findById(id);
        if (!candidate)
            throw new http_exception_1.HttpException(404, 'Candidate not found');
        const isValid = await (0, password_1.comparePassword)(current, candidate.password_hash);
        if (!isValid)
            throw new http_exception_1.HttpException(400, 'Incorrect current password');
        const passwordHash = await (0, password_1.hashPassword)(newPass);
        return this.candidateRepository.update(id, { password_hash: passwordHash });
    }
    async verifyEmail(token) {
        const verificationToken = await this.candidateRepository.findVerificationTokenByToken(token);
        if (!verificationToken) {
            throw new http_exception_1.HttpException(400, 'Invalid verification token');
        }
        // Check if token is expired
        if (new Date() > verificationToken.expires_at) {
            throw new http_exception_1.HttpException(400, 'Verification token has expired');
        }
        // Check if token is already used
        if (verificationToken.used_at) {
            throw new http_exception_1.HttpException(400, 'Verification token has already been used');
        }
        // Mark token as used
        await this.candidateRepository.markVerificationTokenUsed(verificationToken.id);
        // Update candidate status to ACTIVE
        const candidate = await this.candidateRepository.update(verificationToken.candidate.id, {
            status: 'ACTIVE',
        });
        // Create auto-login session
        const sessionId = (0, session_1.generateSessionId)();
        const expiresAt = (0, session_1.getSessionExpiration)();
        await this.candidateRepository.createSession({
            session_id: sessionId,
            candidate: { connect: { id: candidate.id } },
            email: candidate.email,
            expires_at: expiresAt,
        });
        return { candidate, sessionId };
    }
    async getCurrentCandidate(id) {
        const candidate = await this.candidateRepository.findById(id);
        if (!candidate)
            throw new http_exception_1.HttpException(404, 'Candidate not found');
        return candidate;
    }
    // Assessment Methods
    async getAssessments(candidateId) {
        const assessments = await this.candidateRepository.getAssessments(candidateId);
        // Enrich with job title and round name
        return Promise.all(assessments.map(async (assessment) => {
            let jobTitle = 'Unknown Job';
            let roundName = 'Assessment';
            if (assessment.job_round_id) {
                const jobRound = await this.candidateRepository.getJobRoundWithJob(assessment.job_round_id);
                if (jobRound) {
                    roundName = jobRound.name;
                    if (jobRound.job)
                        jobTitle = jobRound.job.title;
                }
            }
            if (jobTitle === 'Unknown Job' && assessment.job_id) {
                const job = await this.candidateRepository.getJobTitle(assessment.job_id);
                if (job)
                    jobTitle = job.title;
            }
            return {
                id: assessment.id,
                status: assessment.status,
                invitedAt: assessment.invited_at,
                expiryDate: assessment.expiry_date,
                completedAt: assessment.completed_at,
                jobId: assessment.job_id,
                jobTitle,
                roundName,
            };
        }));
    }
    async getAssessmentDetails(candidateId, assessmentId) {
        const assessment = await this.candidateRepository.getAssessmentById(assessmentId, candidateId);
        if (!assessment) {
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        }
        // Fetch job info and config
        let jobTitle = '';
        if (assessment.job_id) {
            const job = await this.candidateRepository.getJobTitle(assessment.job_id);
            if (job)
                jobTitle = job.title;
        }
        let config = null;
        if (assessment.job_round_id) {
            config = await this.candidateRepository.getAssessmentConfig(assessment.job_round_id);
        }
        return {
            id: assessment.id,
            status: assessment.status,
            invitedAt: assessment.invited_at,
            expiryDate: assessment.expiry_date,
            completedAt: assessment.completed_at,
            jobId: assessment.job_id,
            jobTitle,
            config: config ? {
                timeLimitMinutes: config.time_limit_minutes,
                instructions: config.instructions
            } : null,
            questions: assessment.assessment_question?.map((q) => ({
                id: q.id,
                questionText: q.question_text,
                questionType: q.question_type,
                options: q.options,
                points: q.points,
                order: q.order
            })) || []
        };
    }
    async startAssessment(candidateId, assessmentId) {
        // Verify assessment exists and belongs to candidate
        const assessment = await this.candidateRepository.getAssessmentById(assessmentId, candidateId);
        if (!assessment) {
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        }
        if (assessment.status !== client_1.AssessmentStatus.INVITED && assessment.status !== client_1.AssessmentStatus.IN_PROGRESS) {
            throw new http_exception_1.HttpException(400, 'Assessment cannot be started');
        }
        // If already in progress, just return success
        if (assessment.status === client_1.AssessmentStatus.IN_PROGRESS) {
            return { message: 'Assessment already in progress' };
        }
        // Update status
        const startedAt = new Date().toISOString();
        await this.candidateRepository.updateAssessmentStatus(assessmentId, 'IN_PROGRESS', startedAt);
        return { message: 'Assessment started', startedAt };
    }
    async submitAssessment(candidateId, assessmentId, answers) {
        if (!answers || !Array.isArray(answers)) {
            throw new http_exception_1.HttpException(400, 'Invalid answers format');
        }
        // Verify assessment exists and belongs to candidate
        const assessment = await this.candidateRepository.getAssessmentById(assessmentId, candidateId);
        if (!assessment) {
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        }
        if (assessment.status === client_1.AssessmentStatus.COMPLETED) {
            throw new http_exception_1.HttpException(400, 'Assessment already completed');
        }
        // Save responses using repository transaction
        await this.candidateRepository.submitAssessmentResponses(assessmentId, candidateId, answers);
        return { message: 'Assessment submitted successfully' };
    }
    // Documents Methods
    async updateDocuments(candidateId, data) {
        if (!data.resumes && !data.coverLetters && !data.portfolios) {
            throw new http_exception_1.HttpException(400, 'No document updates provided');
        }
        const updates = {};
        if (data.resumes && Array.isArray(data.resumes)) {
            updates.resumes = await Promise.all(data.resumes.map(async (resume) => {
                if (resume.id) {
                    return this.candidateRepository.updateResume(resume.id, candidateId, resume);
                }
                else {
                    return this.candidateRepository.createResume(candidateId, resume);
                }
            }));
        }
        if (data.coverLetters && Array.isArray(data.coverLetters)) {
            updates.coverLetters = await Promise.all(data.coverLetters.map(async (letter) => {
                if (letter.id) {
                    return this.candidateRepository.updateCoverLetter(letter.id, letter);
                }
                else {
                    return this.candidateRepository.createCoverLetter(candidateId, letter);
                }
            }));
        }
        if (data.portfolios && Array.isArray(data.portfolios)) {
            updates.portfolios = await Promise.all(data.portfolios.map(async (portfolio) => {
                if (portfolio.id) {
                    return this.candidateRepository.updatePortfolio(portfolio.id, portfolio);
                }
                else {
                    return this.candidateRepository.createPortfolio(candidateId, portfolio);
                }
            }));
        }
        if (data.deleteResumes && Array.isArray(data.deleteResumes)) {
            await Promise.all(data.deleteResumes.map((id) => this.candidateRepository.deleteResume(id)));
        }
        if (data.deleteCoverLetters && Array.isArray(data.deleteCoverLetters)) {
            await Promise.all(data.deleteCoverLetters.map((id) => this.candidateRepository.deleteCoverLetter(id)));
        }
        if (data.deletePortfolios && Array.isArray(data.deletePortfolios)) {
            await Promise.all(data.deletePortfolios.map((id) => this.candidateRepository.deletePortfolio(id)));
        }
        return updates;
    }
    // Qualifications Methods
    async updateQualifications(candidateId, data) {
        if (!data.education && !data.certifications && !data.training) {
            throw new http_exception_1.HttpException(400, 'No qualification updates provided');
        }
        const updates = {};
        if (data.education && Array.isArray(data.education)) {
            updates.education = await Promise.all(data.education.map(async (edu) => {
                if (edu.id) {
                    return this.candidateRepository.updateEducation(edu.id, edu);
                }
                else {
                    return this.candidateRepository.createEducation(candidateId, edu);
                }
            }));
        }
        if (data.certifications && Array.isArray(data.certifications)) {
            updates.certifications = await Promise.all(data.certifications.map(async (cert) => {
                if (cert.id) {
                    return this.candidateRepository.updateCertification(cert.id, cert);
                }
                else {
                    return this.candidateRepository.createCertification(candidateId, cert);
                }
            }));
        }
        if (data.training && Array.isArray(data.training)) {
            updates.training = await Promise.all(data.training.map(async (train) => {
                if (train.id) {
                    return this.candidateRepository.updateTraining(train.id, train);
                }
                else {
                    return this.candidateRepository.createTraining(candidateId, train);
                }
            }));
        }
        if (data.deleteEducation && Array.isArray(data.deleteEducation)) {
            await Promise.all(data.deleteEducation.map((id) => this.candidateRepository.deleteEducation(id)));
        }
        if (data.deleteCertifications && Array.isArray(data.deleteCertifications)) {
            await Promise.all(data.deleteCertifications.map((id) => this.candidateRepository.deleteCertification(id)));
        }
        if (data.deleteTraining && Array.isArray(data.deleteTraining)) {
            await Promise.all(data.deleteTraining.map((id) => this.candidateRepository.deleteTraining(id)));
        }
        return updates;
    }
    // Work History Methods
    async updateWorkHistory(candidateId, data) {
        if (!data.workExperience && !Array.isArray(data)) {
            throw new http_exception_1.HttpException(400, 'No work history updates provided');
        }
        const workExperienceList = data.workExperience || data;
        const updates = await Promise.all(workExperienceList.map(async (experience) => {
            const mappedData = this.mapWorkExperienceInput(experience);
            if (experience.id) {
                return this.candidateRepository.updateWorkExperience(experience.id, mappedData);
            }
            else {
                return this.candidateRepository.createWorkExperience(candidateId, mappedData);
            }
        }));
        if (data.deleteWorkExperience && Array.isArray(data.deleteWorkExperience)) {
            await Promise.all(data.deleteWorkExperience.map((id) => this.candidateRepository.deleteWorkExperience(id)));
        }
        return updates.map((exp) => this.mapWorkExperience(exp));
    }
    // Helper for mapping Work Experience
    mapWorkExperience(exp) {
        return {
            id: exp.id,
            company: exp.company,
            role: exp.role,
            startDate: exp.start_date,
            endDate: exp.end_date,
            current: exp.current,
            description: exp.description,
            location: exp.location,
            createdAt: exp.created_at,
            updatedAt: exp.updated_at
        };
    }
    ;
    // Helper for mapping Work Experience Input (camelCase -> snake_case)
    mapWorkExperienceInput(data) {
        return {
            company: data.company,
            role: data.role,
            start_date: data.startDate,
            end_date: data.endDate,
            current: data.current,
            description: data.description,
            location: data.location,
        };
    }
    // Helper for mapping Education Input
    mapEducationInput(data) {
        return {
            institution: data.institution,
            degree: data.degree,
            field: data.field,
            start_date: data.startDate,
            end_date: data.endDate,
            current: data.current,
            description: data.description,
            location: data.location,
        };
    }
    // Helper for mapping Certification Input
    mapCertificationInput(data) {
        return {
            name: data.name,
            issuing_org: data.issuingOrg,
            issue_date: data.issueDate,
            expiry_date: data.expiryDate,
            credential_id: data.credentialId,
            credential_url: data.credentialUrl,
            does_not_expire: data.doesNotExpire,
        };
    }
    // Helper for mapping Training Input
    mapTrainingInput(data) {
        return {
            title: data.title,
            institution: data.institution,
            start_date: data.startDate,
            end_date: data.endDate,
            current: data.current,
            description: data.description,
            location: data.location,
        };
    }
    async getWorkHistory(candidateId) {
        const experiences = await this.candidateRepository.getWorkHistory(candidateId);
        return experiences.map((exp) => this.mapWorkExperience(exp));
    }
    async createWorkExperience(candidateId, data) {
        const mappedData = this.mapWorkExperienceInput(data);
        const experience = await this.candidateRepository.createWorkExperience(candidateId, mappedData);
        return this.mapWorkExperience(experience);
    }
    async updateWorkExperienceItem(id, data) {
        const mappedData = this.mapWorkExperienceInput(data);
        const experience = await this.candidateRepository.updateWorkExperience(id, mappedData);
        return this.mapWorkExperience(experience);
    }
    async deleteWorkExperience(id) {
        return this.candidateRepository.deleteWorkExperience(id);
    }
    // Notification Preferences
    async getNotificationPreferences(candidateId) {
        const preferences = await this.candidateRepository.getNotificationPreferences(candidateId);
        if (!preferences) {
            // Return default preferences if none exist
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
        return preferences;
    }
    async updateNotificationPreferences(candidateId, data) {
        return this.candidateRepository.upsertNotificationPreferences(candidateId, data);
    }
    // Skills
    async getSkills(candidateId) {
        return this.candidateRepository.getSkills(candidateId);
    }
    async updateSkills(candidateId, data) {
        const { skills, deleteSkills } = data;
        if (skills && Array.isArray(skills)) {
            await Promise.all(skills.map(async (skill) => {
                // Handle string skills (e.g. ['Java', 'Python'])
                const skillData = typeof skill === 'string' ? { name: skill } : skill;
                if (skillData.id) {
                    return this.candidateRepository.updateSkill(skillData.id, skillData);
                }
                else {
                    return this.candidateRepository.createSkill(candidateId, skillData);
                }
            }));
        }
        if (deleteSkills && Array.isArray(deleteSkills)) {
            await Promise.all(deleteSkills.map((id) => this.candidateRepository.deleteSkill(id)));
        }
        return this.candidateRepository.getSkills(candidateId);
    }
    // Saved Jobs
    async getSavedJobs(candidateId) {
        return this.candidateRepository.getSavedJobs(candidateId);
    }
    async removeSavedJob(candidateId, jobId) {
        return this.candidateRepository.deleteSavedJob(candidateId, jobId);
    }
    // Saved Searches  
    async getSavedSearches(candidateId) {
        return this.candidateRepository.getSavedSearches(candidateId);
    }
    async deleteSavedSearch(searchId) {
        return this.candidateRepository.deleteSavedSearch(searchId);
    }
    // Job Alerts
    async getJobAlerts(candidateId) {
        return this.candidateRepository.getJobAlerts(candidateId);
    }
    async createJobAlert(candidateId, data) {
        return this.candidateRepository.createJobAlert(candidateId, data);
    }
    async updateJobAlert(alertId, data) {
        return this.candidateRepository.updateJobAlert(alertId, data);
    }
    async deleteJobAlert(alertId) {
        return this.candidateRepository.deleteJobAlert(alertId);
    }
    // Qualifications
    async getEducation(candidateId) {
        const qualifications = await this.candidateRepository.getQualifications(candidateId);
        return qualifications.education;
    }
    async createEducation(candidateId, data) {
        const mappedData = this.mapEducationInput(data);
        return this.candidateRepository.createEducation(candidateId, mappedData);
    }
    async updateEducation(id, data) {
        const mappedData = this.mapEducationInput(data);
        return this.candidateRepository.updateEducation(id, mappedData);
    }
    async deleteEducation(id) {
        return this.candidateRepository.deleteEducation(id);
    }
    async getCertifications(candidateId) {
        const qualifications = await this.candidateRepository.getQualifications(candidateId);
        return qualifications.certifications;
    }
    async createCertification(candidateId, data) {
        const mappedData = this.mapCertificationInput(data);
        return this.candidateRepository.createCertification(candidateId, mappedData);
    }
    async updateCertification(id, data) {
        const mappedData = this.mapCertificationInput(data);
        return this.candidateRepository.updateCertification(id, mappedData);
    }
    async deleteCertification(id) {
        return this.candidateRepository.deleteCertification(id);
    }
    async getTraining(candidateId) {
        const qualifications = await this.candidateRepository.getQualifications(candidateId);
        return qualifications.training;
    }
    async createTraining(candidateId, data) {
        const mappedData = this.mapTrainingInput(data);
        return this.candidateRepository.createTraining(candidateId, mappedData);
    }
    async updateTraining(id, data) {
        const mappedData = this.mapTrainingInput(data);
        return this.candidateRepository.updateTraining(id, mappedData);
    }
    async deleteTraining(id) {
        return this.candidateRepository.deleteTraining(id);
    }
}
exports.CandidateService = CandidateService;
