import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const salesController = new SalesController();

router.use(authenticateConsultant);

// Dashboard
router.get('/dashboard/stats', salesController.getStats);

// Leads
router.get('/leads', salesController.getMyLeads);
router.post('/leads', salesController.createLead);
router.post('/leads/:id/convert', salesController.convert);
router.post('/leads/:leadId/convert', salesController.convert);
router.post('/leads/:id/conversion-request', salesController.submitRequest);
router.post('/leads/:leadId/conversion-request', salesController.submitRequest);

// Conversion Requests
router.get('/conversion-requests', salesController.getMyRequests);
router.get('/conversion-requests/:id', salesController.getRequest);
router.put('/conversion-requests/:id/cancel', salesController.cancelRequest);

// Opportunities
router.get('/opportunities', salesController.getOpportunities);
router.post('/opportunities', salesController.createOpportunity);
router.put('/opportunities/:id', salesController.updateOpportunity);
router.get('/opportunities/stats', salesController.getPipelineStats);

// Companies
router.get('/companies', salesController.getCompanies);

// Activities
router.get('/activities', salesController.getActivities);
router.post('/activities', salesController.createActivity);

// Commissions & Withdrawals
router.get('/commissions', salesController.getCommissions);
router.get('/commissions/balance', salesController.getBalance);
router.post('/commissions/withdraw', salesController.requestWithdrawal);
router.get('/commissions/withdrawals', salesController.getWithdrawals);
router.post('/commissions/withdrawals/:id/cancel', salesController.cancelWithdrawal);
router.post('/commissions/withdrawals/:id/execute', salesController.executeWithdrawal);

// Stripe Connect
router.post('/stripe/onboard', salesController.stripeOnboard);
router.get('/stripe/status', salesController.getStripeStatus);
router.post('/stripe/login-link', salesController.getStripeLoginLink);

export default router;
