import { Router } from 'express';
import { ConsultantController } from './consultant.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const consultantController = new ConsultantController();

// Auth
router.post('/auth/login', consultantController.login as any);
router.post('/auth/logout', authenticateConsultant, consultantController.logout as any);
router.get('/auth/me', authenticateConsultant, consultantController.getCurrentUser as any);

// Profile
router.get('/profile', authenticateConsultant, consultantController.getProfile as any);
router.put('/profile', authenticateConsultant, consultantController.updateProfile as any);

// Jobs
router.get('/jobs', authenticateConsultant, consultantController.getJobs as any);
router.get('/jobs/:jobId', authenticateConsultant, consultantController.getJobDetails as any);
router.post('/jobs/:jobId/shortlist', authenticateConsultant, consultantController.submitShortlist as any);
router.post('/jobs/:jobId/flag', authenticateConsultant, consultantController.flagJob as any);
router.post('/jobs/:jobId/log', authenticateConsultant, consultantController.logJobActivity as any);
router.get('/jobs/:jobId/pipeline', authenticateConsultant, consultantController.getJobPipeline as any);
router.patch('/jobs/:jobId/pipeline', authenticateConsultant, consultantController.updateJobPipeline as any);
router.get('/jobs/:jobId/candidates/pipeline', authenticateConsultant, consultantController.getPipeline as any);
router.get('/jobs/:jobId/rounds', authenticateConsultant, consultantController.getJobRounds as any);

// Candidates
router.post('/candidates/:applicationId/status', authenticateConsultant, consultantController.updateCandidateStatus as any);
router.post('/candidates/:applicationId/note', authenticateConsultant, consultantController.addCandidateNote as any);
router.post('/candidates/:applicationId/move-to-round', authenticateConsultant, consultantController.moveCandidateToRound as any);
router.post('/candidates/:applicationId/stage', authenticateConsultant, consultantController.updateCandidateStage as any);

// Messaging
router.get('/conversations', authenticateConsultant, consultantController.listConversations as any);
router.get('/conversations/:conversationId/messages', authenticateConsultant, consultantController.getMessages as any);
router.post('/conversations/:conversationId/messages', authenticateConsultant, consultantController.sendMessage as any);
router.patch('/conversations/:conversationId/read', authenticateConsultant, consultantController.markMessagesRead as any);

// Commissions & Withdrawals
router.get('/commissions', authenticateConsultant, consultantController.getCommissions as any);
router.get('/commissions/balance', authenticateConsultant, consultantController.getWithdrawalBalance as any);
router.get('/commissions/withdrawals', authenticateConsultant, consultantController.getWithdrawals as any);
router.post('/commissions/withdraw', authenticateConsultant, consultantController.requestWithdrawal as any);
router.post('/commissions/withdrawals/:id/cancel', authenticateConsultant, consultantController.cancelWithdrawal as any);
router.post('/commissions/withdrawals/:id/execute', authenticateConsultant, consultantController.executeWithdrawal as any);

// Performance
router.get('/performance', authenticateConsultant, consultantController.getPerformance as any);
router.get('/analytics/dashboard', authenticateConsultant, consultantController.getDashboardAnalytics as any);

// Stripe
router.get('/stripe/status', authenticateConsultant, consultantController.getStripeStatus as any);
router.post('/stripe/onboard', authenticateConsultant, consultantController.initiateStripeOnboarding as any);
router.post('/stripe/login-link', authenticateConsultant, consultantController.getStripeLoginLink as any);

export default router;
