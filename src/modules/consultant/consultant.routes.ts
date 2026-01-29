import { Router } from 'express';
import { ConsultantController } from './consultant.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const consultantController = new ConsultantController();

// Auth
router.post('/auth/login', consultantController.login);
router.post('/auth/logout', consultantController.logout);
router.post('/auth/setup-account', consultantController.setupAccount);
router.get('/auth/me', authenticateConsultant, consultantController.getCurrentConsultant);

// Profile
router.get('/profile', authenticateConsultant, consultantController.getProfile);
router.put('/profile', authenticateConsultant, consultantController.updateProfile);

// Jobs
router.get('/jobs', authenticateConsultant, consultantController.getJobs);
router.get('/jobs/:id', authenticateConsultant, consultantController.getJobDetails);
router.post('/jobs/:id/shortlist', authenticateConsultant, consultantController.submitShortlist);
router.post('/jobs/:id/flag', authenticateConsultant, consultantController.flagJob);
router.post('/jobs/:id/log', authenticateConsultant, consultantController.logJobActivity);
router.get('/jobs/:id/pipeline', authenticateConsultant, consultantController.getJobPipeline);
router.patch('/jobs/:id/pipeline', authenticateConsultant, consultantController.updateJobPipeline);


// Commissions
router.get('/commissions', authenticateConsultant, consultantController.getCommissions);
router.get('/commissions/stats', authenticateConsultant, consultantController.getCommissionStats);
router.get('/commissions/:id', authenticateConsultant, consultantController.getCommissionDetails);

// Wallet & Withdrawals
router.get('/wallet', authenticateConsultant, consultantController.getWallet);
router.post('/withdrawals', authenticateConsultant, consultantController.requestWithdrawal);
router.get('/withdrawals', authenticateConsultant, consultantController.getWithdrawals);

// Stripe
router.post('/stripe/onboard', authenticateConsultant, consultantController.onboardStripe);
router.get('/stripe/status', authenticateConsultant, consultantController.getStripeStatus);
router.get('/stripe/dashboard', authenticateConsultant, consultantController.getStripeDashboard);

// Performance
router.get('/performance', authenticateConsultant, consultantController.getPerformance);
router.get('/analytics/dashboard', authenticateConsultant, consultantController.getDashboardAnalytics);

// Messages
router.get('/messages', authenticateConsultant, consultantController.listConversations);
router.get('/messages/:conversationId', authenticateConsultant, consultantController.getMessages);
router.post('/messages/:conversationId', authenticateConsultant, consultantController.sendMessage);
router.put('/messages/:conversationId/read', authenticateConsultant, consultantController.markRead);

// Candidates & Pipeline Management
router.get('/jobs/:jobId/candidates', authenticateConsultant, consultantController.getPipeline);
router.get('/jobs/:jobId/rounds', authenticateConsultant, consultantController.getJobRounds);
router.post('/candidates/:applicationId/status', authenticateConsultant, consultantController.updateStatus);
router.post('/candidates/:applicationId/note', authenticateConsultant, consultantController.addNote);
router.post('/candidates/:applicationId/move-to-round', authenticateConsultant, consultantController.moveToRound);
router.post('/candidates/:applicationId/stage', authenticateConsultant, consultantController.updateStage);

export default router;
