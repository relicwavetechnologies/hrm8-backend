import { Router } from 'express';
import multer from 'multer';
import { CandidateController } from './candidate.controller';
import messagingRoutes from '../messaging/messaging.routes';
import { authenticateCandidate } from '../../middlewares/candidate-auth.middleware';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';

const router = Router();
const controller = new CandidateController();
const upload = multer({ storage: multer.memoryStorage() });

// --- PUBLIC AUTH ---
router.post('/auth/login', controller.login);
router.post('/auth/register', controller.register);
router.get('/auth/verify-email', controller.verifyEmail);

// --- PROTECTED ROUTES (Requires Candidate Auth) ---
router.use(authenticateCandidate);

// Auth & Session
router.post('/auth/logout', controller.logout);
router.get('/auth/me', controller.me);

// Profile Management
router.get('/profile', controller.getProfile);
router.put('/profile', controller.updateProfile);
router.put('/profile/password', controller.updatePassword);
router.put('/profile/photo', controller.updatePhoto);
router.delete('/profile', controller.deleteAccount);
router.get('/profile/export', controller.exportData);

// Work History
router.get('/work-history', controller.getWorkHistory);
router.post('/work-history', controller.addWorkHistory);
router.put('/work-history/:id', controller.updateWorkHistory);
router.delete('/work-history/:id', controller.deleteWorkHistory);

// Education
router.get('/education', controller.getEducation);
router.post('/education', controller.addEducation);
router.put('/education/:id', controller.updateEducation);
router.delete('/education/:id', controller.deleteEducation);
// Qualification aliases
router.get('/qualifications/education', controller.getEducation);
router.post('/qualifications/education', controller.addEducation);
router.put('/qualifications/education/:id', controller.updateEducation);
router.delete('/qualifications/education/:id', controller.deleteEducation);

// Skills
router.get('/skills', controller.getSkills);
router.put('/skills', controller.updateSkills);
router.post('/skills', controller.updateSkills); // Support both for safety

// Certifications
router.get('/certifications', controller.getCertifications);
router.post('/certifications', controller.addCertification);
router.put('/certifications/:id', controller.updateCertification);
router.delete('/certifications/:id', controller.deleteCertification);
// Qualification aliases
router.get('/qualifications/certifications', controller.getCertifications);
router.get('/qualifications/certifications/expiring', controller.getExpiringCertifications);
router.post('/qualifications/certifications', controller.addCertification);
router.put('/qualifications/certifications/:id', controller.updateCertification);
router.delete('/qualifications/certifications/:id', controller.deleteCertification);

// Training
router.get('/training', controller.getTraining);
router.post('/training', controller.addTraining);
router.put('/training/:id', controller.updateTraining);
router.delete('/training/:id', controller.deleteTraining);
// Qualification aliases
router.get('/qualifications/training', controller.getTraining);
router.post('/qualifications/training', controller.addTraining);
router.put('/qualifications/training/:id', controller.updateTraining);
router.delete('/qualifications/training/:id', controller.deleteTraining);

// --- Document Management ---
router.get('/documents/resumes', controller.getResumes);
router.post('/documents/resumes', upload.single('file'), controller.addResume);
router.put('/documents/resumes/:id/set-default', controller.setDefaultResume);
router.delete('/documents/resumes/:id', controller.deleteResume);

router.get('/documents/cover-letters', controller.getCoverLetters);
router.post('/documents/cover-letters', upload.single('file'), controller.addCoverLetter);
router.put('/documents/cover-letters/:id', upload.single('file'), controller.updateCoverLetter);
router.delete('/documents/cover-letters/:id', controller.deleteCoverLetter);

router.get('/documents/portfolio', controller.getPortfolios);
router.post('/documents/portfolio', upload.single('file'), controller.addPortfolio);
router.put('/documents/portfolio/:id', upload.single('file'), controller.updatePortfolio);
router.delete('/documents/portfolio/:id', controller.deletePortfolio);

// Saved Jobs, Searches, Alerts
router.get('/saved-jobs', controller.getSavedJobs);
router.post('/saved-jobs/:jobId', controller.saveJob);
router.delete('/saved-jobs/:jobId', controller.unsaveJob);

router.get('/saved-searches', controller.getSavedSearches);
router.post('/saved-searches', controller.saveSearch);
router.delete('/saved-searches/:id', controller.deleteSavedSearch);

router.get('/job-alerts', controller.getJobAlerts);
router.post('/job-alerts', controller.addJobAlert);
router.delete('/job-alerts/:id', controller.deleteJobAlert);

// Discovery
router.get('/recommended-jobs', controller.getRecommendedJobs);
router.post('/resume/parse', upload.single('resume'), controller.parseResume);

// --- Messaging (Shared Routes) ---
router.use('/messages', messagingRoutes);

export default router;
