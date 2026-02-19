"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const consultant360_controller_1 = require("./consultant360.controller");
const consultant_auth_middleware_1 = require("../../middlewares/consultant-auth.middleware");
const router = (0, express_1.Router)();
const controller = new consultant360_controller_1.Consultant360Controller();
// Dashboard & Leads (admin bypass allowed for testing)
router.get('/dashboard', consultant_auth_middleware_1.authenticateConsultant, controller.getDashboard);
router.get('/leads', consultant_auth_middleware_1.authenticateConsultant, controller.getLeads);
router.post('/leads', consultant_auth_middleware_1.authenticateConsultant, controller.createLead);
router.post('/leads/:leadId/conversion-request', consultant_auth_middleware_1.authenticateConsultant, controller.submitConversionRequest);
// Financial routes: strict consultant auth only (no admin masquerade)
router.get('/earnings', consultant_auth_middleware_1.authenticateConsultantStrict, controller.getEarnings);
router.post('/commissions/request', consultant_auth_middleware_1.authenticateConsultantStrict, controller.requestCommission);
router.get('/commissions', consultant_auth_middleware_1.authenticateConsultantStrict, controller.getCommissions);
router.get('/balance', consultant_auth_middleware_1.authenticateConsultantStrict, controller.getBalance);
router.post('/withdraw', consultant_auth_middleware_1.authenticateConsultantStrict, controller.requestWithdrawal);
router.get('/withdrawals', consultant_auth_middleware_1.authenticateConsultantStrict, controller.getWithdrawals);
router.post('/withdrawals/:id/cancel', consultant_auth_middleware_1.authenticateConsultantStrict, controller.cancelWithdrawal);
router.post('/withdrawals/:id/execute', consultant_auth_middleware_1.authenticateConsultantStrict, controller.executeWithdrawal);
router.post('/stripe/onboard', consultant_auth_middleware_1.authenticateConsultantStrict, controller.stripeOnboard);
router.get('/stripe/status', consultant_auth_middleware_1.authenticateConsultantStrict, controller.getStripeStatus);
router.post('/stripe/login-link', consultant_auth_middleware_1.authenticateConsultantStrict, controller.getStripeLoginLink);
exports.default = router;
