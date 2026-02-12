import { Router } from 'express';
import { Consultant360Controller } from './consultant360.controller';
import { authenticateConsultant, authenticateConsultantStrict } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const controller = new Consultant360Controller();

// Dashboard & Leads (admin bypass allowed for testing)
router.get('/dashboard', authenticateConsultant, controller.getDashboard);
router.get('/leads', authenticateConsultant, controller.getLeads);
router.post('/leads', authenticateConsultant, controller.createLead);
router.post('/leads/:leadId/conversion-request', authenticateConsultant, controller.submitConversionRequest);

// Financial routes: strict consultant auth only (no admin masquerade)
router.get('/earnings', authenticateConsultantStrict, controller.getEarnings);
router.post('/commissions/request', authenticateConsultantStrict, controller.requestCommission);
router.get('/commissions', authenticateConsultantStrict, controller.getCommissions);
router.get('/balance', authenticateConsultantStrict, controller.getBalance);
router.post('/withdraw', authenticateConsultantStrict, controller.requestWithdrawal);
router.get('/withdrawals', authenticateConsultantStrict, controller.getWithdrawals);
router.post('/withdrawals/:id/cancel', authenticateConsultantStrict, controller.cancelWithdrawal);
router.post('/withdrawals/:id/execute', authenticateConsultantStrict, controller.executeWithdrawal);
router.post('/stripe/onboard', authenticateConsultantStrict, controller.stripeOnboard);
router.get('/stripe/status', authenticateConsultantStrict, controller.getStripeStatus);
router.post('/stripe/login-link', authenticateConsultantStrict, controller.getStripeLoginLink);

export default router;
