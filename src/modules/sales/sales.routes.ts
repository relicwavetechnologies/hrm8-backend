import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const salesController = new SalesController();

// Dashboard
router.get('/dashboard/stats', authenticateConsultant, salesController.getDashboardStats as any);

// Leads
router.get('/leads', authenticateConsultant, salesController.getLeads as any);
router.post('/leads', authenticateConsultant, salesController.createLead as any);
router.post('/leads/:leadId/convert', authenticateConsultant, salesController.convertLead as any);
router.post('/leads/:leadId/conversion-request', authenticateConsultant, salesController.submitConversionRequest as any);

// Conversion Requests
router.get('/conversion-requests', authenticateConsultant, salesController.getConversionRequests as any);
router.get('/conversion-requests/:id', authenticateConsultant, salesController.getConversionRequest as any);
router.put('/conversion-requests/:id/cancel', authenticateConsultant, salesController.cancelConversionRequest as any);

// Opportunities
router.get('/opportunities', authenticateConsultant, salesController.getOpportunities as any);
router.post('/opportunities', authenticateConsultant, salesController.createOpportunity as any);
router.get('/opportunities/stats', authenticateConsultant, salesController.getPipelineStats as any);
router.put('/opportunities/:id', authenticateConsultant, salesController.updateOpportunity as any);

// Companies
router.get('/companies', authenticateConsultant, salesController.getCompanies as any);

// Commissions
router.get('/commissions', authenticateConsultant, salesController.getCommissions as any);
router.get('/commissions/balance', authenticateConsultant, salesController.getWithdrawalBalance as any);

// Withdrawals
router.post('/commissions/withdraw', authenticateConsultant, salesController.requestWithdrawal as any);
router.get('/commissions/withdrawals', authenticateConsultant, salesController.getWithdrawals as any);
router.post('/commissions/withdrawals/:id/cancel', authenticateConsultant, salesController.cancelWithdrawal as any);
router.post('/commissions/withdrawals/:id/execute', authenticateConsultant, salesController.executeWithdrawal as any);

// Stripe
router.get('/stripe/status', authenticateConsultant, salesController.getStripeStatus as any);
router.post('/stripe/onboard', authenticateConsultant, salesController.initiateStripeOnboarding as any);
router.post('/stripe/login-link', authenticateConsultant, salesController.getStripeLoginLink as any);

// Activities
router.get('/activities', authenticateConsultant, salesController.getActivities as any);
router.post('/activities', authenticateConsultant, salesController.createActivity as any);

export default router;
