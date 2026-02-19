"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateController = void 0;
const controller_1 = require("../../core/controller");
const candidate_service_1 = require("./candidate.service");
const candidate_repository_1 = require("./candidate.repository");
const session_1 = require("../../utils/session");
class CandidateController extends controller_1.BaseController {
    getParam(value) {
        if (Array.isArray(value))
            return value[0];
        return value || '';
    }
    constructor() {
        super();
        // Auth
        this.login = async (req, res) => {
            try {
                const { email, password } = req.body;
                const { candidate, sessionId } = await this.candidateService.login({ email, password });
                res.cookie('candidateSessionId', sessionId, (0, session_1.getSessionCookieOptions)());
                const { password_hash, ...candidateData } = candidate;
                return this.sendSuccess(res, { candidate: candidateData });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.logout = async (req, res) => {
            try {
                const sessionId = req.cookies?.candidateSessionId;
                if (sessionId) {
                    await this.candidateService.logout(sessionId);
                }
                res.clearCookie('candidateSessionId', (0, session_1.getSessionCookieOptions)());
                return this.sendSuccess(res, { message: 'Logged out successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.register = async (req, res) => {
            try {
                const candidate = await this.candidateService.register(req.body);
                const { password_hash, ...candidateData } = candidate;
                res.status(201);
                return this.sendSuccess(res, { candidate: candidateData, message: 'Please check your email to verify your account' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.verifyEmail = async (req, res) => {
            try {
                const { token } = req.query;
                if (!token) {
                    return this.sendError(res, new Error('Verification token is required'));
                }
                const { candidate, sessionId } = await this.candidateService.verifyEmail(token);
                res.cookie('candidateSessionId', sessionId, (0, session_1.getSessionCookieOptions)());
                const { password_hash, ...candidateData } = candidate;
                return this.sendSuccess(res, {
                    candidate: candidateData,
                    message: 'Email verified successfully'
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getCurrentCandidate = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const candidate = await this.candidateService.getCurrentCandidate(req.candidate.id);
                const { password_hash, ...candidateData } = candidate;
                return this.sendSuccess(res, { candidate: candidateData });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Profile
        this.getProfile = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const candidate = await this.candidateService.getProfile(req.candidate.id);
                const { password_hash, ...candidateData } = candidate;
                return this.sendSuccess(res, { candidate: candidateData });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateProfile = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const candidate = await this.candidateService.updateProfile(req.candidate.id, req.body);
                const { password_hash, ...candidateData } = candidate;
                return this.sendSuccess(res, { candidate: candidateData });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updatePassword = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const { currentPassword, newPassword } = req.body;
                await this.candidateService.updatePassword(req.candidate.id, currentPassword, newPassword);
                return this.sendSuccess(res, { message: 'Password updated successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Assessment Methods
        this.getAssessments = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const assessments = await this.candidateService.getAssessments(req.candidate.id);
                return this.sendSuccess(res, { assessments });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getAssessment = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const assessment = await this.candidateService.getAssessmentDetails(req.candidate.id, id);
                return this.sendSuccess(res, { assessment });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.startAssessment = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const result = await this.candidateService.startAssessment(req.candidate.id, id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.submitAssessment = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const { answers } = req.body;
                const result = await this.candidateService.submitAssessment(req.candidate.id, id, answers);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getDocuments = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const repo = new candidate_repository_1.CandidateRepository();
                const docs = await repo.getDocuments(req.candidate.id);
                const mappedResumes = docs.resumes.map((resume) => ({
                    id: resume.id,
                    fileName: resume.file_name,
                    fileUrl: resume.file_url,
                    fileSize: resume.file_size,
                    fileType: resume.file_type,
                    isDefault: resume.is_default,
                    uploadedAt: resume.uploaded_at,
                    version: resume.version
                }));
                const mappedCoverLetters = docs.coverLetters.map((cl) => ({
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
                const mappedPortfolios = docs.portfolios.map((p) => ({
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
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateDocuments = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const updates = await this.candidateService.updateDocuments(req.candidate.id, req.body);
                return this.sendSuccess(res, { documents: updates, message: 'Documents updated successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getQualifications = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const repo = new candidate_repository_1.CandidateRepository();
                const quals = await repo.getQualifications(req.candidate.id);
                const mappedEducation = quals.education.map((e) => ({
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
                const mappedCertifications = quals.certifications.map((c) => ({
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
                const mappedTraining = quals.training.map((t) => ({
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
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateQualifications = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const updates = await this.candidateService.updateQualifications(req.candidate.id, req.body);
                return this.sendSuccess(res, { qualifications: updates, message: 'Qualifications updated successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getWorkHistory = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const workExperience = await this.candidateService.getWorkHistory(req.candidate.id);
                return this.sendSuccess(res, workExperience);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createWorkHistory = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const experience = await this.candidateService.createWorkExperience(req.candidate.id, req.body);
                return this.sendSuccess(res, experience);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateWorkHistory = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                let result;
                if (id) {
                    // Single update
                    result = await this.candidateService.updateWorkExperienceItem(id, req.body);
                }
                else {
                    // Bulk update
                    result = await this.candidateService.updateWorkHistory(req.candidate.id, req.body);
                }
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteWorkHistory = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = this.getParam(req.params.id);
                await this.candidateService.deleteWorkExperience(id);
                return this.sendSuccess(res, { message: 'Experience deleted' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Notification Preferences
        this.getNotificationPreferences = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const preferences = await this.candidateService.getNotificationPreferences(req.candidate.id);
                return this.sendSuccess(res, preferences);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateNotificationPreferences = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const preferences = await this.candidateService.updateNotificationPreferences(req.candidate.id, req.body);
                return this.sendSuccess(res, { preferences });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Skills
        this.getSkills = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const skills = await this.candidateService.getSkills(req.candidate.id);
                return this.sendSuccess(res, skills);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateSkills = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const skills = await this.candidateService.updateSkills(req.candidate.id, req.body);
                return this.sendSuccess(res, skills);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Saved Jobs
        this.getSavedJobs = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const savedJobs = await this.candidateService.getSavedJobs(req.candidate.id);
                return this.sendSuccess(res, savedJobs);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.removeSavedJob = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                await this.candidateService.removeSavedJob(req.candidate.id, id);
                return this.sendSuccess(res, { message: 'Job removed from saved' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Saved Searches
        this.getSavedSearches = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const savedSearches = await this.candidateService.getSavedSearches(req.candidate.id);
                return this.sendSuccess(res, savedSearches);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteSavedSearch = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                await this.candidateService.deleteSavedSearch(id);
                return this.sendSuccess(res, { message: 'Search deleted' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Job Alerts
        this.getJobAlerts = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const jobAlerts = await this.candidateService.getJobAlerts(req.candidate.id);
                return this.sendSuccess(res, jobAlerts);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createJobAlert = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const alert = await this.candidateService.createJobAlert(req.candidate.id, req.body);
                res.status(201);
                return this.sendSuccess(res, { alert });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateJobAlert = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const alert = await this.candidateService.updateJobAlert(id, req.body);
                return this.sendSuccess(res, { alert });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteJobAlert = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                await this.candidateService.deleteJobAlert(id);
                return this.sendSuccess(res, { message: 'Job alert deleted' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Qualifications - Education
        this.getEducation = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const education = await this.candidateService.getEducation(req.candidate.id);
                return this.sendSuccess(res, education);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createEducation = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const education = await this.candidateService.createEducation(req.candidate.id, req.body);
                res.status(201);
                return this.sendSuccess(res, { education });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateEducation = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const education = await this.candidateService.updateEducation(id, req.body);
                return this.sendSuccess(res, { education });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteEducation = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                await this.candidateService.deleteEducation(id);
                return this.sendSuccess(res, { message: 'Education deleted' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Qualifications - Certifications
        this.getCertifications = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const certifications = await this.candidateService.getCertifications(req.candidate.id);
                return this.sendSuccess(res, certifications);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getExpiringCertifications = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const certifications = await this.candidateService.getCertifications(req.candidate.id);
                const now = new Date();
                const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
                const expiring = certifications.filter((cert) => {
                    if (!cert.expiry_date || cert.does_not_expire)
                        return false;
                    const expiry = new Date(cert.expiry_date);
                    return expiry <= threeMonthsFromNow && expiry > now;
                });
                return this.sendSuccess(res, expiring);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createCertification = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const certification = await this.candidateService.createCertification(req.candidate.id, req.body);
                res.status(201);
                return this.sendSuccess(res, { certification });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateCertification = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const certification = await this.candidateService.updateCertification(id, req.body);
                return this.sendSuccess(res, { certification });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteCertification = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                await this.candidateService.deleteCertification(id);
                return this.sendSuccess(res, { message: 'Certification deleted' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Qualifications - Training
        this.getTraining = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const training = await this.candidateService.getTraining(req.candidate.id);
                return this.sendSuccess(res, training);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createTraining = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const training = await this.candidateService.createTraining(req.candidate.id, req.body);
                res.status(201);
                return this.sendSuccess(res, { training });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateTraining = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const training = await this.candidateService.updateTraining(id, req.body);
                return this.sendSuccess(res, { training });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteTraining = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                await this.candidateService.deleteTraining(id);
                return this.sendSuccess(res, { message: 'Training deleted' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.candidateService = new candidate_service_1.CandidateService(new candidate_repository_1.CandidateRepository());
    }
}
exports.CandidateController = CandidateController;
