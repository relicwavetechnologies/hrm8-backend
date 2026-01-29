import { Router } from 'express';
import { Consultant360Controller } from './consultant-360.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const controller = new Consultant360Controller();

// Dashboard
router.get('/dashboard', authenticateConsultant, controller.getUnifiedDashboard);

// Leads
router.get('/leads', authenticateConsultant, controller.getLeads);
router.post('/leads', authenticateConsultant, controller.createLead);
router.post('/leads/:id/conversion-request', authenticateConsultant, controller.submitConversionRequest);

// Financials
router.get('/earnings', authenticateConsultant, controller.getUnifiedEarnings);
router.get('/commissions', authenticateConsultant, controller.getUnifiedCommissions);
router.get('/balance', authenticateConsultant, controller.getUnifiedBalance);

// Withdrawals
router.post('/withdraw', authenticateConsultant, controller.requestWithdrawal);
router.get('/withdrawals', authenticateConsultant, controller.getWithdrawals);
router.post('/withdrawals/:id/cancel', authenticateConsultant, controller.cancelWithdrawal);
router.post('/withdrawals/:id/execute', authenticateConsultant, controller.executeWithdrawal); // Likely admin or self-test

// Stripe
router.post('/stripe/onboard', authenticateConsultant, controller.stripeOnboard);
router.get('/stripe/status', authenticateConsultant, controller.getStripeStatus);
router.post('/stripe/login-link', authenticateConsultant, controller.getStripeLoginLink);

export default router;
