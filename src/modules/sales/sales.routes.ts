import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const salesController = new SalesController();

// Apply auth middleware to all sales routes
router.use(authenticateConsultant);

// --- Leads ---
router.post('/leads', salesController.createLead);
router.get('/leads', salesController.getMyLeads);
router.post('/leads/:id/convert', salesController.convert);

// --- Lead Conversion Requests ---
router.post('/leads/:id/conversion-request', salesController.submitRequest);
router.get('/conversion-requests', salesController.getMyRequests);
router.get('/conversion-requests/:id', salesController.getRequest);
router.put('/conversion-requests/:id/cancel', salesController.cancelRequest);

// --- Opportunities ---
router.get('/opportunities', salesController.getOpportunities);
router.post('/opportunities', salesController.createOpportunity);
router.put('/opportunities/:id', salesController.updateOpportunity);
router.get('/opportunities/stats', salesController.getPipelineStats);

// --- Activities ---
router.get('/activities', salesController.getActivities);
router.post('/activities', salesController.createActivity);

// --- Withdrawals ---
router.get('/commissions/balance', salesController.getBalance);
router.post('/commissions/withdraw', salesController.requestWithdrawal);
router.get('/commissions/withdrawals', salesController.getWithdrawals);
router.post('/commissions/withdrawals/:id/cancel', salesController.cancelWithdrawal);
router.post('/commissions/withdrawals/:id/execute', salesController.executeWithdrawal);

// --- Stripe Connect ---
router.post('/stripe/onboard', salesController.stripeOnboard);
router.get('/stripe/status', salesController.getStripeStatus);
router.post('/stripe/login-link', salesController.getStripeLoginLink);

// --- Dashboard & Stats ---
router.get('/dashboard/stats', salesController.getStats);
router.get('/companies', salesController.getCompanies);
router.get('/commissions', salesController.getCommissions);

export default router;
