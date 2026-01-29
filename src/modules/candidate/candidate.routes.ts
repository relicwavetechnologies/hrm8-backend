import { Router } from 'express';
import multer from 'multer';
import { CandidateController } from './candidate.controller';
import { authenticateCandidate } from '../../middlewares/candidate-auth.middleware';

const router = Router();
const candidateController = new CandidateController();
const upload = multer({ storage: multer.memoryStorage() });

// Auth
router.post('/auth/login', candidateController.login);
router.post('/auth/logout', candidateController.logout);
router.post('/auth/register', candidateController.register);

// Profile
router.get('/profile', authenticateCandidate, candidateController.getProfile);
router.get('/auth/me', authenticateCandidate, candidateController.getProfile);
router.put('/profile', authenticateCandidate, candidateController.updateProfile);
router.put('/profile/password', authenticateCandidate, candidateController.updatePassword);

// Work History
router.get('/work-history', authenticateCandidate, candidateController.getWorkHistory);
router.post('/work-history', authenticateCandidate, candidateController.addWorkHistory);
router.put('/work-history/:id', authenticateCandidate, candidateController.updateWorkHistory);
router.delete('/work-history/:id', authenticateCandidate, candidateController.deleteWorkHistory);

// Education
router.get('/qualifications/education', authenticateCandidate, candidateController.getEducation);
router.post('/qualifications/education', authenticateCandidate, candidateController.addEducation);
router.put('/qualifications/education/:id', authenticateCandidate, candidateController.updateEducation);
router.delete('/qualifications/education/:id', authenticateCandidate, candidateController.deleteEducation);

// Skills
router.get('/skills', authenticateCandidate, candidateController.getSkills);
router.post('/skills', authenticateCandidate, candidateController.updateSkills);

// Certifications
router.get('/qualifications/certifications', authenticateCandidate, candidateController.getCertifications);
router.post('/qualifications/certifications', authenticateCandidate, candidateController.addCertification);
router.put('/qualifications/certifications/:id', authenticateCandidate, candidateController.updateCertification);
router.delete('/qualifications/certifications/:id', authenticateCandidate, candidateController.deleteCertification);

// Training
router.get('/qualifications/training', authenticateCandidate, candidateController.getTraining);
router.post('/qualifications/training', authenticateCandidate, candidateController.addTraining);
router.put('/qualifications/training/:id', authenticateCandidate, candidateController.updateTraining);
router.delete('/qualifications/training/:id', authenticateCandidate, candidateController.deleteTraining);

// Resume & Documents
router.get('/resumes', authenticateCandidate, candidateController.getResumes);
router.post('/resumes', authenticateCandidate, candidateController.addResume);
router.delete('/resumes/:id', authenticateCandidate, candidateController.deleteResume);
router.post('/resume/parse', authenticateCandidate, upload.single('resume'), candidateController.parseResume);

// Cover Letters
router.get('/cover-letters', authenticateCandidate, candidateController.getCoverLetters);
router.post('/cover-letters', authenticateCandidate, candidateController.addCoverLetter);
router.delete('/cover-letters/:id', authenticateCandidate, candidateController.deleteCoverLetter);

// Portfolios
router.get('/portfolios', authenticateCandidate, candidateController.getPortfolios);
router.post('/portfolios', authenticateCandidate, candidateController.addPortfolio);
router.delete('/portfolios/:id', authenticateCandidate, candidateController.deletePortfolio);

// Saved Jobs
router.get('/saved-jobs', authenticateCandidate, candidateController.getSavedJobs);
router.post('/saved-jobs/:jobId', authenticateCandidate, candidateController.saveJob);
router.delete('/saved-jobs/:jobId', authenticateCandidate, candidateController.unsaveJob);

// Saved Searches
router.get('/saved-searches', authenticateCandidate, candidateController.getSavedSearches);
router.post('/saved-searches', authenticateCandidate, candidateController.saveSearch);
router.delete('/saved-searches/:id', authenticateCandidate, candidateController.deleteSavedSearch);

// Job Alerts
router.get('/job-alerts', authenticateCandidate, candidateController.getJobAlerts);
router.post('/job-alerts', authenticateCandidate, candidateController.addJobAlert);
router.delete('/job-alerts/:id', authenticateCandidate, candidateController.deleteJobAlert);

// Recommended Jobs
router.get('/recommended-jobs', authenticateCandidate, candidateController.getRecommendedJobs);

export default router;
