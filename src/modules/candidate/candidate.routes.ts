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
router.post('/auth/login', candidateController.login);
router.post('/auth/logout', candidateController.logout);
router.post('/auth/register', candidateController.register);
router.get('/auth/verify-email', candidateController.verifyEmail);
router.get('/auth/me', authenticateCandidate, candidateController.getCurrentCandidate);

// Assessments
router.get('/assessments', authenticateCandidate, candidateController.getAssessments);
router.get('/assessments/:id', authenticateCandidate, candidateController.getAssessment);
router.post('/assessments/:id/start', authenticateCandidate, candidateController.startAssessment);
router.post('/assessments/:id/submit', authenticateCandidate, candidateController.submitAssessment);

// Messages
router.get('/messages/conversations', authenticateCandidate, messagingController.getConversations);
router.get('/messages/conversations/:conversationId', authenticateCandidate, messagingController.getConversation);
router.post('/messages/conversations', authenticateCandidate, messagingController.createConversation);
router.post('/messages/send', authenticateCandidate, messagingController.sendMessage);
router.put('/messages/conversations/:conversationId/read', authenticateCandidate, messagingController.markAsRead);
router.post('/messages/conversations/:conversationId/archive', authenticateCandidate, messagingController.archiveConversation);
router.post('/messages/conversations/:conversationId/close', authenticateCandidate, messagingController.closeConversation);

// Jobs
router.get('/jobs', authenticateCandidate, jobsController.listJobs);
router.get('/jobs/:id', authenticateCandidate, jobsController.getJob);
router.post('/jobs/:id/apply', authenticateCandidate, jobsController.applyJob);
router.post('/jobs/:id/save', authenticateCandidate, jobsController.saveJob);
router.get('/jobs/search', authenticateCandidate, jobsController.searchJobs);

// Recommended Jobs
router.get('/recommended-jobs', authenticateCandidate, jobsController.getRecommendedJobs);

// Applications
router.get('/applications', authenticateCandidate, applicationsController.listApplications);
router.get('/applications/:id', authenticateCandidate, applicationsController.getApplicationStatus);
router.get('/applications/tracking', authenticateCandidate, applicationsController.getApplicationTracking);

// Offers
router.get('/offers/:offerId', authenticateCandidate, offersController.getOffer);
router.post('/offers/:offerId/accept', authenticateCandidate, offersController.acceptOffer);
router.post('/offers/:offerId/decline', authenticateCandidate, offersController.declineOffer);
router.post('/offers/:offerId/negotiations', authenticateCandidate, offersController.initiateNegotiation);
router.post('/offers/:offerId/negotiations/:negotiationId/respond', authenticateCandidate, offersController.respondToNegotiation);
router.post('/offers/:offerId/documents', authenticateCandidate, offersController.uploadDocument);
router.get('/offers/:offerId/documents', authenticateCandidate, offersController.getOfferDocuments);
router.get('/offers/:offerId/negotiations', authenticateCandidate, offersController.getNegotiations);

// Profile
router.get('/profile', authenticateCandidate, candidateController.getProfile);
router.put('/profile', authenticateCandidate, candidateController.updateProfile);
router.put('/profile/password', authenticateCandidate, candidateController.updatePassword);

// Profile - Documents, Qualifications, Work History routes
router.get('/profile/documents', authenticateCandidate, candidateController.getDocuments);
router.put('/profile/documents', authenticateCandidate, candidateController.updateDocuments);

router.get('/profile/qualifications', authenticateCandidate, candidateController.getQualifications);
router.put('/profile/qualifications', authenticateCandidate, candidateController.updateQualifications);

router.get('/profile/work-history', authenticateCandidate, candidateController.getWorkHistory);
router.post('/profile/work-history', authenticateCandidate, candidateController.createWorkHistory);
router.put('/profile/work-history', authenticateCandidate, candidateController.updateWorkHistory);
router.put('/profile/work-history/:id', authenticateCandidate, candidateController.updateWorkHistory);
router.delete('/profile/work-history/:id', authenticateCandidate, candidateController.deleteWorkHistory);

// Shorthand routes (for backwards compatibility)
router.get('/work-history', authenticateCandidate, candidateController.getWorkHistory);
router.post('/work-history', authenticateCandidate, candidateController.createWorkHistory);
router.put('/work-history', authenticateCandidate, candidateController.updateWorkHistory);
router.put('/work-history/:id', authenticateCandidate, candidateController.updateWorkHistory);
router.delete('/work-history/:id', authenticateCandidate, candidateController.deleteWorkHistory);
router.get('/skills', authenticateCandidate, candidateController.getSkills);
router.post('/skills', authenticateCandidate, candidateController.updateSkills);
router.put('/skills', authenticateCandidate, candidateController.updateSkills);

// Documents - Granular endpoints
// Resumes
router.get('/documents/resumes', authenticateCandidate, documentsController.listResumes);
router.post('/documents/resumes', authenticateCandidate, documentsController.uploadSingle, documentsController.uploadResume);
router.post('/resume/parse', authenticateCandidate, documentsController.uploadResumeMiddleware, documentsController.parseResume);
router.put('/documents/resumes/:id/set-default', authenticateCandidate, documentsController.setDefaultResume);
router.delete('/documents/resumes/:id', authenticateCandidate, documentsController.deleteResume);

// Cover Letters
router.get('/documents/cover-letters', authenticateCandidate, documentsController.listCoverLetters);
router.post('/documents/cover-letters', authenticateCandidate, documentsController.uploadSingle, documentsController.createCoverLetter);
router.put('/documents/cover-letters/:id', authenticateCandidate, documentsController.uploadSingle, documentsController.updateCoverLetter);
router.delete('/documents/cover-letters/:id', authenticateCandidate, documentsController.deleteCoverLetter);

// Portfolio
router.get('/documents/portfolio', authenticateCandidate, documentsController.listPortfolioItems);
router.post('/documents/portfolio', authenticateCandidate, documentsController.uploadSingle, documentsController.createPortfolioItem);
router.put('/documents/portfolio/:id', authenticateCandidate, documentsController.uploadSingle, documentsController.updatePortfolioItem);
router.delete('/documents/portfolio/:id', authenticateCandidate, documentsController.deletePortfolioItem);

// Saved Jobs & Searches
router.get('/saved-jobs', authenticateCandidate, candidateController.getSavedJobs);
router.delete('/saved-jobs/:id', authenticateCandidate, candidateController.removeSavedJob);
router.get('/saved-searches', authenticateCandidate, candidateController.getSavedSearches);
router.delete('/saved-searches/:id', authenticateCandidate, candidateController.deleteSavedSearch);
router.get('/job-alerts', authenticateCandidate, candidateController.getJobAlerts);
router.post('/job-alerts', authenticateCandidate, candidateController.createJobAlert);
router.put('/job-alerts/:id', authenticateCandidate, candidateController.updateJobAlert);
router.delete('/job-alerts/:id', authenticateCandidate, (req, res) => candidateController.deleteJobAlert(req as any, res));

// Qualifications - Education
router.get('/qualifications/education', authenticateCandidate, (req, res) => candidateController.getEducation(req as any, res));
router.post('/qualifications/education', authenticateCandidate, (req, res) => candidateController.createEducation(req as any, res));
router.put('/qualifications/education/:id', authenticateCandidate, (req, res) => candidateController.updateEducation(req as any, res));
router.delete('/qualifications/education/:id', authenticateCandidate, (req, res) => candidateController.deleteEducation(req as any, res));

// Qualifications - Certifications
router.get('/qualifications/certifications', authenticateCandidate, (req, res) => candidateController.getCertifications(req as any, res));
router.get('/qualifications/certifications/expiring', authenticateCandidate, (req, res) => candidateController.getExpiringCertifications(req as any, res));
router.post('/qualifications/certifications', authenticateCandidate, (req, res) => candidateController.createCertification(req as any, res));
router.put('/qualifications/certifications/:id', authenticateCandidate, (req, res) => candidateController.updateCertification(req as any, res));
router.delete('/qualifications/certifications/:id', authenticateCandidate, (req, res) => candidateController.deleteCertification(req as any, res));

// Qualifications - Training
router.get('/qualifications/training', authenticateCandidate, (req, res) => candidateController.getTraining(req as any, res));
router.post('/qualifications/training', authenticateCandidate, (req, res) => candidateController.createTraining(req as any, res));
router.put('/qualifications/training/:id', authenticateCandidate, (req, res) => candidateController.updateTraining(req as any, res));
router.delete('/qualifications/training/:id', authenticateCandidate, (req, res) => candidateController.deleteTraining(req as any, res));

// Notification Preferences
router.get('/notifications/preferences', authenticateCandidate, candidateController.getNotificationPreferences);
router.put('/notifications/preferences', authenticateCandidate, candidateController.updateNotificationPreferences);

// Notifications
router.get('/notifications', authenticateCandidate, notificationController.list);
router.patch('/notifications/:id/read', authenticateCandidate, notificationController.markRead);
router.patch('/notifications/read-all', authenticateCandidate, notificationController.markAllRead);

export default router;
