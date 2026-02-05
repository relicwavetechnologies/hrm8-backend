import { Router } from 'express';
import { ConsultantController } from './consultant.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const consultantController = new ConsultantController();

// Auth
router.post('/auth/login', consultantController.login);
router.post('/auth/logout', authenticateConsultant, consultantController.logout);
router.post('/auth/setup-account', consultantController.setupAccount);
router.get('/auth/me', authenticateConsultant, consultantController.getCurrentUser);

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
router.post('/candidates/:applicationId/move-to-round', authenticateConsultant, consultantController.moveCandidateToRound);
router.post('/candidates/:applicationId/stage', authenticateConsultant, consultantController.updateCandidateStage);

// Messaging
router.get('/conversations', authenticateConsultant, consultantController.listConversations);
router.get('/conversations/:conversationId/messages', authenticateConsultant, consultantController.getMessages);
router.post('/conversations/:conversationId/messages', authenticateConsultant, consultantController.sendMessage);
router.patch('/conversations/:conversationId/read', authenticateConsultant, consultantController.markMessagesRead);

// Commissions
router.get('/commissions', authenticateConsultant, consultantController.getCommissions);
router.get('/commissions/stats', authenticateConsultant, consultantController.getCommissionStats);
router.get('/commissions/:id', authenticateConsultant, consultantController.getCommissionDetails);

// Wallet & Withdrawals
router.get('/wallet', authenticateConsultant, consultantController.getWallet);
router.post('/withdrawals', authenticateConsultant, consultantController.requestWithdrawal);
router.get('/withdrawals', authenticateConsultant, consultantController.getWithdrawals);
router.post('/withdrawals/:id/cancel', authenticateConsultant, consultantController.cancelWithdrawal);
router.post('/withdrawals/:id/execute', authenticateConsultant, consultantController.executeWithdrawal);

// Performance
router.get('/performance', authenticateConsultant, consultantController.getPerformance);
router.get('/analytics/dashboard', authenticateConsultant, consultantController.getDashboardAnalytics);

// Stripe
router.get('/stripe/status', authenticateConsultant, consultantController.getStripeStatus);
router.post('/stripe/onboard', authenticateConsultant, consultantController.onboardStripe);
router.get('/stripe/dashboard', authenticateConsultant, consultantController.getStripeDashboard);
router.post('/stripe/login-link', authenticateConsultant, consultantController.getStripeLoginLink);

export default router;
