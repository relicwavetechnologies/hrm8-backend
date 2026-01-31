import { Router } from 'express';
import { CandidateController } from './candidate.controller';
import { CandidateMessagingController } from './candidate-messaging.controller';
import { CandidateOffersController } from './candidate-offers.controller';
import { CandidateJobsController } from './candidate-jobs.controller';
import { CandidateApplicationsController } from './candidate-applications.controller';
import { authenticateCandidate } from '../../middlewares/candidate-auth.middleware';

const router = Router();
const candidateController = new CandidateController();
const messagingController = new CandidateMessagingController();
const offersController = new CandidateOffersController();
const jobsController = new CandidateJobsController();
const applicationsController = new CandidateApplicationsController();

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
router.post('/messages/send', authenticateCandidate, messagingController.sendMessage);
router.put('/messages/conversations/:conversationId/read', authenticateCandidate, messagingController.markAsRead);

// Jobs
router.get('/jobs', authenticateCandidate, jobsController.listJobs);
router.get('/jobs/:id', authenticateCandidate, jobsController.getJob);
router.post('/jobs/:id/apply', authenticateCandidate, jobsController.applyJob);
router.post('/jobs/:id/save', authenticateCandidate, jobsController.saveJob);
router.get('/jobs/search', authenticateCandidate, jobsController.searchJobs);

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
router.put('/profile/work-history', authenticateCandidate, candidateController.updateWorkHistory);

export default router;
