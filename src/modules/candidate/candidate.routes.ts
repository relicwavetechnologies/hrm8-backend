import { Router } from 'express';
import { CandidateController } from './candidate.controller';
import { CandidateMessagingController } from './candidate-messaging.controller';
import { CandidateOffersController } from './candidate-offers.controller';
import { CandidateJobsController } from './candidate-jobs.controller';
import { CandidateApplicationsController } from './candidate-applications.controller';
import { CandidateDocumentsController } from './candidate-documents.controller';
import { NotificationController } from '../notification/notification.controller';
import { authenticateCandidate } from '../../middlewares/candidate-auth.middleware';

const router = Router();
const candidateController = new CandidateController();
const messagingController = new CandidateMessagingController();
const offersController = new CandidateOffersController();
const jobsController = new CandidateJobsController();
const applicationsController = new CandidateApplicationsController();
const documentsController = new CandidateDocumentsController();
const notificationController = new NotificationController();

// Auth
router.post('/auth/login', candidateController.login as any);
router.post('/auth/logout', candidateController.logout as any);
router.post('/auth/register', candidateController.register as any);
router.get('/auth/verify-email', candidateController.verifyEmail as any);
router.get('/auth/me', authenticateCandidate, candidateController.getCurrentCandidate as any);

// Assessments
router.get('/assessments', authenticateCandidate, candidateController.getAssessments as any);
router.get('/assessments/:id', authenticateCandidate, candidateController.getAssessment as any);
router.post('/assessments/:id/start', authenticateCandidate, candidateController.startAssessment as any);
router.post('/assessments/:id/submit', authenticateCandidate, candidateController.submitAssessment as any);

// Messages
router.get('/messages/conversations', authenticateCandidate, messagingController.getConversations as any);
router.get('/messages/conversations/:conversationId', authenticateCandidate, messagingController.getConversation as any);
router.post('/messages/conversations', authenticateCandidate, messagingController.createConversation as any);
router.post('/messages/send', authenticateCandidate, messagingController.sendMessage as any);
router.put('/messages/conversations/:conversationId/read', authenticateCandidate, messagingController.markAsRead as any);
router.post('/messages/conversations/:conversationId/archive', authenticateCandidate, messagingController.archiveConversation as any);
router.post('/messages/conversations/:conversationId/close', authenticateCandidate, messagingController.closeConversation as any);

// Jobs
router.get('/jobs', authenticateCandidate, jobsController.listJobs as any);
router.get('/jobs/:id', authenticateCandidate, jobsController.getJob as any);
router.post('/jobs/:id/apply', authenticateCandidate, jobsController.applyJob as any);
router.post('/jobs/:id/save', authenticateCandidate, jobsController.saveJob as any);
router.get('/jobs/search', authenticateCandidate, jobsController.searchJobs as any);

// Recommended Jobs
router.get('/recommended-jobs', authenticateCandidate, jobsController.getRecommendedJobs as any);

// Applications
router.get('/applications', authenticateCandidate, applicationsController.listApplications as any);
router.get('/applications/:id', authenticateCandidate, applicationsController.getApplicationStatus as any);
router.get('/applications/tracking', authenticateCandidate, applicationsController.getApplicationTracking as any);

// Offers
router.get('/offers/:offerId', authenticateCandidate, offersController.getOffer as any);
router.post('/offers/:offerId/accept', authenticateCandidate, offersController.acceptOffer as any);
router.post('/offers/:offerId/decline', authenticateCandidate, offersController.declineOffer as any);
router.post('/offers/:offerId/negotiations', authenticateCandidate, offersController.initiateNegotiation as any);
router.post('/offers/:offerId/negotiations/:negotiationId/respond', authenticateCandidate, offersController.respondToNegotiation as any);
router.post('/offers/:offerId/documents', authenticateCandidate, offersController.uploadDocument as any);
router.get('/offers/:offerId/documents', authenticateCandidate, offersController.getOfferDocuments as any);
router.get('/offers/:offerId/negotiations', authenticateCandidate, offersController.getNegotiations as any);

// Profile
router.get('/profile', authenticateCandidate, candidateController.getProfile as any);
router.put('/profile', authenticateCandidate, candidateController.updateProfile as any);
router.put('/profile/password', authenticateCandidate, candidateController.updatePassword as any);

// Profile - Documents, Qualifications, Work History routes
router.get('/profile/documents', authenticateCandidate, candidateController.getDocuments as any);
router.put('/profile/documents', authenticateCandidate, candidateController.updateDocuments as any);

router.get('/profile/qualifications', authenticateCandidate, candidateController.getQualifications as any);
router.put('/profile/qualifications', authenticateCandidate, candidateController.updateQualifications as any);

router.get('/profile/work-history', authenticateCandidate, candidateController.getWorkHistory as any);
router.post('/profile/work-history', authenticateCandidate, candidateController.createWorkHistory as any);
router.put('/profile/work-history', authenticateCandidate, candidateController.updateWorkHistory as any);
router.put('/profile/work-history/:id', authenticateCandidate, candidateController.updateWorkHistory as any);
router.delete('/profile/work-history/:id', authenticateCandidate, candidateController.deleteWorkHistory as any);

// Shorthand routes (for backwards compatibility)
router.get('/work-history', authenticateCandidate, candidateController.getWorkHistory as any);
router.post('/work-history', authenticateCandidate, candidateController.createWorkHistory as any);
router.put('/work-history', authenticateCandidate, candidateController.updateWorkHistory as any);
router.put('/work-history/:id', authenticateCandidate, candidateController.updateWorkHistory as any);
router.delete('/work-history/:id', authenticateCandidate, candidateController.deleteWorkHistory as any);
router.get('/skills', authenticateCandidate, candidateController.getSkills as any);
router.post('/skills', authenticateCandidate, candidateController.updateSkills as any);
router.put('/skills', authenticateCandidate, candidateController.updateSkills as any);

// Documents - Granular endpoints
// Resumes
router.get('/documents/resumes', authenticateCandidate, documentsController.listResumes as any);
router.post('/documents/resumes', authenticateCandidate, documentsController.uploadSingle as any, documentsController.uploadResume as any);
router.post('/resume/parse', authenticateCandidate, documentsController.uploadResumeMiddleware as any, documentsController.parseResume as any);
router.put('/documents/resumes/:id/set-default', authenticateCandidate, documentsController.setDefaultResume as any);
router.delete('/documents/resumes/:id', authenticateCandidate, documentsController.deleteResume as any);

// Cover Letters
router.get('/documents/cover-letters', authenticateCandidate, documentsController.listCoverLetters as any);
router.post('/documents/cover-letters', authenticateCandidate, documentsController.uploadSingle as any, documentsController.createCoverLetter as any);
router.put('/documents/cover-letters/:id', authenticateCandidate, documentsController.uploadSingle as any, documentsController.updateCoverLetter as any);
router.delete('/documents/cover-letters/:id', authenticateCandidate, documentsController.deleteCoverLetter as any);

// Portfolio
router.get('/documents/portfolio', authenticateCandidate, documentsController.listPortfolioItems as any);
router.post('/documents/portfolio', authenticateCandidate, documentsController.uploadSingle as any, documentsController.createPortfolioItem as any);
router.put('/documents/portfolio/:id', authenticateCandidate, documentsController.uploadSingle as any, documentsController.updatePortfolioItem as any);
router.delete('/documents/portfolio/:id', authenticateCandidate, documentsController.deletePortfolioItem as any);

// Saved Jobs & Searches
router.get('/saved-jobs', authenticateCandidate, candidateController.getSavedJobs as any);
router.delete('/saved-jobs/:id', authenticateCandidate, candidateController.removeSavedJob as any);
router.get('/saved-searches', authenticateCandidate, candidateController.getSavedSearches as any);
router.delete('/saved-searches/:id', authenticateCandidate, candidateController.deleteSavedSearch as any);
router.get('/job-alerts', authenticateCandidate, candidateController.getJobAlerts as any);
router.post('/job-alerts', authenticateCandidate, candidateController.createJobAlert as any);
router.put('/job-alerts/:id', authenticateCandidate, candidateController.updateJobAlert as any);
router.delete('/job-alerts/:id', authenticateCandidate, (req, res) => (candidateController.deleteJobAlert as any)(req as any, res));

// Qualifications - Education
router.get('/qualifications/education', authenticateCandidate, (req, res) => (candidateController.getEducation as any)(req as any, res));
router.post('/qualifications/education', authenticateCandidate, (req, res) => (candidateController.createEducation as any)(req as any, res));
router.put('/qualifications/education/:id', authenticateCandidate, (req, res) => (candidateController.updateEducation as any)(req as any, res));
router.delete('/qualifications/education/:id', authenticateCandidate, (req, res) => (candidateController.deleteEducation as any)(req as any, res));

// Qualifications - Certifications
router.get('/qualifications/certifications', authenticateCandidate, (req, res) => (candidateController.getCertifications as any)(req as any, res));
router.get('/qualifications/certifications/expiring', authenticateCandidate, (req, res) => (candidateController.getExpiringCertifications as any)(req as any, res));
router.post('/qualifications/certifications', authenticateCandidate, (req, res) => (candidateController.createCertification as any)(req as any, res));
router.put('/qualifications/certifications/:id', authenticateCandidate, (req, res) => (candidateController.updateCertification as any)(req as any, res));
router.delete('/qualifications/certifications/:id', authenticateCandidate, (req, res) => (candidateController.deleteCertification as any)(req as any, res));

// Qualifications - Training
router.get('/qualifications/training', authenticateCandidate, (req, res) => (candidateController.getTraining as any)(req as any, res));
router.post('/qualifications/training', authenticateCandidate, (req, res) => (candidateController.createTraining as any)(req as any, res));
router.put('/qualifications/training/:id', authenticateCandidate, (req, res) => (candidateController.updateTraining as any)(req as any, res));
router.delete('/qualifications/training/:id', authenticateCandidate, (req, res) => (candidateController.deleteTraining as any)(req as any, res));

// Notification Preferences
router.get('/notifications/preferences', authenticateCandidate, candidateController.getNotificationPreferences as any);
router.put('/notifications/preferences', authenticateCandidate, candidateController.updateNotificationPreferences as any);

// Notifications
router.get('/notifications', authenticateCandidate, notificationController.list as any);
router.patch('/notifications/:id/read', authenticateCandidate, notificationController.markRead as any);
router.patch('/notifications/read-all', authenticateCandidate, notificationController.markAllRead as any);

export default router;
