import { Router } from 'express';
import { ConsultantController } from './consultant.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const consultantController = new ConsultantController();

// Auth
router.post('/auth/logout', authenticateConsultant, consultantController.logout);

// Profile
router.get('/profile', authenticateConsultant, consultantController.getProfile);
router.put('/profile', authenticateConsultant, consultantController.updateProfile);

// Jobs
router.get('/jobs', authenticateConsultant, consultantController.getJobs);
router.get('/jobs/:jobId', authenticateConsultant, consultantController.getJobDetails);
router.post('/jobs/:jobId/shortlist', authenticateConsultant, consultantController.submitShortlist);
router.post('/jobs/:jobId/flag', authenticateConsultant, consultantController.flagJob);
router.post('/jobs/:jobId/log', authenticateConsultant, consultantController.logJobActivity);
router.get('/jobs/:jobId/pipeline', authenticateConsultant, consultantController.getJobPipeline);
router.patch('/jobs/:jobId/pipeline', authenticateConsultant, consultantController.updateJobPipeline);
router.get('/jobs/:jobId/candidates/pipeline', authenticateConsultant, consultantController.getPipeline);
router.get('/jobs/:jobId/rounds', authenticateConsultant, consultantController.getJobRounds);

// Candidates
router.post('/candidates/:applicationId/status', authenticateConsultant, consultantController.updateCandidateStatus);
router.post('/candidates/:applicationId/note', authenticateConsultant, consultantController.addCandidateNote);
router.post('/candidates/:applicationId/move-round', authenticateConsultant, consultantController.moveCandidateToRound);

// Messaging
router.get('/conversations', authenticateConsultant, consultantController.listConversations);
router.get('/conversations/:conversationId/messages', authenticateConsultant, consultantController.getMessages);
router.post('/conversations/:conversationId/messages', authenticateConsultant, consultantController.sendMessage);
router.patch('/conversations/:conversationId/read', authenticateConsultant, consultantController.markMessagesRead);

// Commissions & Withdrawals
router.get('/commissions', authenticateConsultant, consultantController.getCommissions);
router.get('/commissions/balance', authenticateConsultant, consultantController.getWithdrawalBalance);
router.get('/commissions/withdrawals', authenticateConsultant, consultantController.getWithdrawals);
router.post('/commissions/withdraw', authenticateConsultant, consultantController.requestWithdrawal);
router.post('/commissions/withdrawals/:id/cancel', authenticateConsultant, consultantController.cancelWithdrawal);
router.post('/commissions/withdrawals/:id/execute', authenticateConsultant, consultantController.executeWithdrawal);

// Performance
router.get('/performance', authenticateConsultant, consultantController.getPerformance);
router.get('/analytics/dashboard', authenticateConsultant, consultantController.getDashboardAnalytics);

// Stripe
router.get('/stripe/status', authenticateConsultant, consultantController.getStripeStatus);
router.post('/stripe/onboard', authenticateConsultant, consultantController.initiateStripeOnboarding);
router.post('/stripe/login-link', authenticateConsultant, consultantController.getStripeLoginLink);

export default router;
