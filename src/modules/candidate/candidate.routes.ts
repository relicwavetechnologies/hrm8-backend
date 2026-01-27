import { Router } from 'express';
import { CandidateController } from './candidate.controller';
import { CandidateProfileController } from './candidate-profile.controller';
import { CandidateResumeController } from './candidate-resume.controller';
import { CandidateDocumentController } from './candidate-document.controller';
import { authenticateCandidate } from '../../middlewares/candidate-auth.middleware';

const router = Router();
const candidateController = new CandidateController();
const profileController = new CandidateProfileController();
const resumeController = new CandidateResumeController();
const documentController = new CandidateDocumentController();

// Auth
router.post('/auth/login', candidateController.login);
router.post('/auth/logout', candidateController.logout);
router.post('/auth/register', candidateController.register);
router.get('/auth/me', authenticateCandidate, candidateController.me);
router.get('/auth/verify-email', candidateController.verifyEmail);

// Profile (Personal)
router.get('/profile', authenticateCandidate, candidateController.getProfile);
router.put('/profile', authenticateCandidate, candidateController.updateProfile);
router.put('/profile/password', authenticateCandidate, candidateController.updatePassword);
router.delete('/profile', authenticateCandidate, candidateController.deleteAccount);
router.get('/profile/export', authenticateCandidate, candidateController.exportData);
router.put('/profile/photo', authenticateCandidate, candidateController.updatePhoto);

// Profile (Preferences)
router.get('/profile/preferences', authenticateCandidate, profileController.getPreferences);
router.put('/profile/preferences', authenticateCandidate, profileController.updatePreferences);

// Profile (Notifications)
router.get('/profile/notifications', authenticateCandidate, profileController.getNotificationPreferences);
router.put('/profile/notifications', authenticateCandidate, profileController.updateNotificationPreferences);

// Profile (Work Experience)
router.get('/profile/work-history', authenticateCandidate, profileController.getWorkExperience);
router.post('/profile/work-history', authenticateCandidate, profileController.addWorkExperience);
router.put('/profile/work-history/:id', authenticateCandidate, profileController.updateWorkExperience);
router.delete('/profile/work-history/:id', authenticateCandidate, profileController.deleteWorkExperience);

// Profile (Skills)
router.get('/profile/skills', authenticateCandidate, profileController.getSkills);
router.put('/profile/skills', authenticateCandidate, profileController.updateSkills);

// Profile (Education)
router.get('/profile/education', authenticateCandidate, profileController.getEducation);
router.post('/profile/education', authenticateCandidate, profileController.addEducation);
router.put('/profile/education/:id', authenticateCandidate, profileController.updateEducation);
router.delete('/profile/education/:id', authenticateCandidate, profileController.deleteEducation);

// Profile (Certifications)
router.get('/profile/certifications', authenticateCandidate, profileController.getCertifications);
router.post('/profile/certifications', authenticateCandidate, profileController.addCertification);
router.put('/profile/certifications/:id', authenticateCandidate, profileController.updateCertification);
router.delete('/profile/certifications/:id', authenticateCandidate, profileController.deleteCertification);

// Profile (Training)
router.get('/profile/training', authenticateCandidate, profileController.getTraining);
router.post('/profile/training', authenticateCandidate, profileController.addTraining);
router.put('/profile/training/:id', authenticateCandidate, profileController.updateTraining);
router.delete('/profile/training/:id', authenticateCandidate, profileController.deleteTraining);

// Profile (Portfolio)
router.get('/profile/portfolio', authenticateCandidate, profileController.getPortfolio);
router.post('/profile/portfolio', authenticateCandidate, profileController.addPortfolio);
router.put('/profile/portfolio/:id', authenticateCandidate, profileController.updatePortfolio);
router.delete('/profile/portfolio/:id', authenticateCandidate, profileController.deletePortfolio);

// Resume
router.post('/resume/parse', authenticateCandidate, resumeController.parseResume);
router.get('/resumes', authenticateCandidate, documentController.getResumes);
router.post('/resumes', authenticateCandidate, documentController.addResume);
router.put('/resumes/:id', authenticateCandidate, documentController.updateResume);
router.delete('/resumes/:id', authenticateCandidate, documentController.deleteResume);

// Cover Letters
router.get('/cover-letters', authenticateCandidate, documentController.getCoverLetters);
router.post('/cover-letters', authenticateCandidate, documentController.addCoverLetter);
router.put('/cover-letters/:id', authenticateCandidate, documentController.updateCoverLetter);
router.delete('/cover-letters/:id', authenticateCandidate, documentController.deleteCoverLetter);

// Saved Jobs
router.get('/saved-jobs', authenticateCandidate, profileController.getSavedJobs);
router.post('/saved-jobs', authenticateCandidate, profileController.saveJob);
router.delete('/saved-jobs/:jobId', authenticateCandidate, profileController.unsaveJob);

// Job Alerts
router.get('/job-alerts', authenticateCandidate, profileController.getJobAlerts);
router.post('/job-alerts', authenticateCandidate, profileController.addJobAlert);
router.put('/job-alerts/:id', authenticateCandidate, profileController.updateJobAlert);
router.delete('/job-alerts/:id', authenticateCandidate, profileController.deleteJobAlert);

// Saved Searches
router.get('/saved-searches', authenticateCandidate, profileController.getSavedSearches);
router.post('/saved-searches', authenticateCandidate, profileController.addSavedSearch);
router.delete('/saved-searches/:id', authenticateCandidate, profileController.deleteSavedSearch);

// Job Invitations
router.get('/job-invitations', authenticateCandidate, profileController.getJobInvitations);
router.post('/job-invitations/respond', authenticateCandidate, profileController.respondToInvitation);

export default router;
