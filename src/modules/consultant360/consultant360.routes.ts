import { Router } from 'express';
import { Consultant360Controller } from './consultant360.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const controller = new Consultant360Controller();

// Dashboard
router.get('/dashboard', authenticateConsultant, controller.getDashboard);

// Leads
router.get('/leads', authenticateConsultant, controller.getLeads);
router.post('/leads', authenticateConsultant, controller.createLead);
router.post('/leads/:leadId/conversion-request', authenticateConsultant, controller.submitConversionRequest);

// Earnings
router.get('/earnings', authenticateConsultant, controller.getEarnings);

// Commissions
router.get('/commissions', authenticateConsultant, controller.getCommissions);

// Balance & Withdrawals
router.get('/balance', authenticateConsultant, controller.getBalance);
router.post('/withdraw', authenticateConsultant, controller.requestWithdrawal);
router.get('/withdrawals', authenticateConsultant, controller.getWithdrawals);
router.post('/withdrawals/:id/cancel', authenticateConsultant, controller.cancelWithdrawal);
router.post('/withdrawals/:id/execute', authenticateConsultant, controller.executeWithdrawal);

// Stripe Connect
router.post('/stripe/onboard', authenticateConsultant, controller.stripeOnboard);
router.get('/stripe/status', authenticateConsultant, controller.getStripeStatus);
router.post('/stripe/login-link', authenticateConsultant, controller.getStripeLoginLink);

export default router;
