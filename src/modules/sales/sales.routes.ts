import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const salesController = new SalesController();

// Dashboard
router.get('/dashboard/stats', authenticateConsultant, salesController.getDashboardStats);

// Leads
router.get('/leads', authenticateConsultant, salesController.getLeads);
router.post('/leads', authenticateConsultant, salesController.createLead);
router.post('/leads/:leadId/convert', authenticateConsultant, salesController.convertLead);
router.post('/leads/:leadId/conversion-request', authenticateConsultant, salesController.submitConversionRequest);

// Conversion Requests
router.get('/conversion-requests', authenticateConsultant, salesController.getConversionRequests);
router.get('/conversion-requests/:id', authenticateConsultant, salesController.getConversionRequest);
router.put('/conversion-requests/:id/cancel', authenticateConsultant, salesController.cancelConversionRequest);

// Opportunities
router.get('/opportunities', authenticateConsultant, salesController.getOpportunities);
router.post('/opportunities', authenticateConsultant, salesController.createOpportunity);
router.get('/opportunities/stats', authenticateConsultant, salesController.getPipelineStats);
router.put('/opportunities/:id', authenticateConsultant, salesController.updateOpportunity);

// Companies
router.get('/companies', authenticateConsultant, salesController.getCompanies);

// Commissions
router.get('/commissions', authenticateConsultant, salesController.getCommissions);
router.get('/commissions/balance', authenticateConsultant, salesController.getWithdrawalBalance);

// Withdrawals
router.post('/commissions/withdraw', authenticateConsultant, salesController.requestWithdrawal);
router.get('/commissions/withdrawals', authenticateConsultant, salesController.getWithdrawals);
router.post('/commissions/withdrawals/:id/cancel', authenticateConsultant, salesController.cancelWithdrawal);
router.post('/commissions/withdrawals/:id/execute', authenticateConsultant, salesController.executeWithdrawal);

// Stripe
router.get('/stripe/status', authenticateConsultant, salesController.getStripeStatus);
router.post('/stripe/onboard', authenticateConsultant, salesController.initiateStripeOnboarding);
router.post('/stripe/login-link', authenticateConsultant, salesController.getStripeLoginLink);

// Activities
router.get('/activities', authenticateConsultant, salesController.getActivities);
router.post('/activities', authenticateConsultant, salesController.createActivity);

export default router;
