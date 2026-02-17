"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sales_controller_1 = require("./sales.controller");
const consultant_auth_middleware_1 = require("../../middlewares/consultant-auth.middleware");
const router = (0, express_1.Router)();
const salesController = new sales_controller_1.SalesController();
// Dashboard
router.get('/dashboard/stats', consultant_auth_middleware_1.authenticateConsultant, salesController.getDashboardStats);
// Leads
router.get('/leads', consultant_auth_middleware_1.authenticateConsultant, salesController.getLeads);
router.post('/leads', consultant_auth_middleware_1.authenticateConsultant, salesController.createLead);
router.post('/leads/:leadId/convert', consultant_auth_middleware_1.authenticateConsultant, salesController.convertLead);
router.post('/leads/:leadId/conversion-request', consultant_auth_middleware_1.authenticateConsultant, salesController.submitConversionRequest);
// Conversion Requests
router.get('/conversion-requests', consultant_auth_middleware_1.authenticateConsultant, salesController.getConversionRequests);
router.get('/conversion-requests/:id', consultant_auth_middleware_1.authenticateConsultant, salesController.getConversionRequest);
router.put('/conversion-requests/:id/cancel', consultant_auth_middleware_1.authenticateConsultant, salesController.cancelConversionRequest);
// Opportunities
router.get('/opportunities', consultant_auth_middleware_1.authenticateConsultant, salesController.getOpportunities);
router.post('/opportunities', consultant_auth_middleware_1.authenticateConsultant, salesController.createOpportunity);
router.get('/opportunities/stats', consultant_auth_middleware_1.authenticateConsultant, salesController.getPipelineStats);
router.put('/opportunities/:id', consultant_auth_middleware_1.authenticateConsultant, salesController.updateOpportunity);
// Companies
router.get('/companies', consultant_auth_middleware_1.authenticateConsultant, salesController.getCompanies);
// Commissions
router.get('/commissions', consultant_auth_middleware_1.authenticateConsultant, salesController.getCommissions);
router.get('/commissions/balance', consultant_auth_middleware_1.authenticateConsultant, salesController.getWithdrawalBalance);
// Withdrawals
router.post('/commissions/withdraw', consultant_auth_middleware_1.authenticateConsultant, salesController.requestWithdrawal);
router.get('/commissions/withdrawals', consultant_auth_middleware_1.authenticateConsultant, salesController.getWithdrawals);
router.post('/commissions/withdrawals/:id/cancel', consultant_auth_middleware_1.authenticateConsultant, salesController.cancelWithdrawal);
router.post('/commissions/withdrawals/:id/execute', consultant_auth_middleware_1.authenticateConsultant, salesController.executeWithdrawal);
// Stripe
router.get('/stripe/status', consultant_auth_middleware_1.authenticateConsultant, salesController.getStripeStatus);
router.post('/stripe/onboard', consultant_auth_middleware_1.authenticateConsultant, salesController.initiateStripeOnboarding);
router.post('/stripe/login-link', consultant_auth_middleware_1.authenticateConsultant, salesController.getStripeLoginLink);
// Activities
router.get('/activities', consultant_auth_middleware_1.authenticateConsultant, salesController.getActivities);
router.post('/activities', consultant_auth_middleware_1.authenticateConsultant, salesController.createActivity);
exports.default = router;
