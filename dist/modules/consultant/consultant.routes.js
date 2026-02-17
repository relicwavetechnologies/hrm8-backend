"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const consultant_controller_1 = require("./consultant.controller");
const consultant_auth_middleware_1 = require("../../middlewares/consultant-auth.middleware");
const router = (0, express_1.Router)();
const consultantController = new consultant_controller_1.ConsultantController();
// Auth
router.post('/auth/login', consultantController.login);
router.post('/auth/logout', consultant_auth_middleware_1.authenticateConsultant, consultantController.logout);
router.get('/auth/me', consultant_auth_middleware_1.authenticateConsultant, consultantController.getCurrentUser);
// Profile
router.get('/profile', consultant_auth_middleware_1.authenticateConsultant, consultantController.getProfile);
router.put('/profile', consultant_auth_middleware_1.authenticateConsultant, consultantController.updateProfile);
// Jobs
router.get('/jobs', consultant_auth_middleware_1.authenticateConsultant, consultantController.getJobs);
router.get('/jobs/:jobId', consultant_auth_middleware_1.authenticateConsultant, consultantController.getJobDetails);
router.post('/jobs/:jobId/shortlist', consultant_auth_middleware_1.authenticateConsultant, consultantController.submitShortlist);
router.post('/jobs/:jobId/flag', consultant_auth_middleware_1.authenticateConsultant, consultantController.flagJob);
router.post('/jobs/:jobId/log', consultant_auth_middleware_1.authenticateConsultant, consultantController.logJobActivity);
router.get('/jobs/:jobId/pipeline', consultant_auth_middleware_1.authenticateConsultant, consultantController.getJobPipeline);
router.patch('/jobs/:jobId/pipeline', consultant_auth_middleware_1.authenticateConsultant, consultantController.updateJobPipeline);
router.get('/jobs/:jobId/candidates/pipeline', consultant_auth_middleware_1.authenticateConsultant, consultantController.getPipeline);
router.get('/jobs/:jobId/rounds', consultant_auth_middleware_1.authenticateConsultant, consultantController.getJobRounds);
// Candidates
router.post('/candidates/:applicationId/status', consultant_auth_middleware_1.authenticateConsultant, consultantController.updateCandidateStatus);
router.post('/candidates/:applicationId/note', consultant_auth_middleware_1.authenticateConsultant, consultantController.addCandidateNote);
router.post('/candidates/:applicationId/move-to-round', consultant_auth_middleware_1.authenticateConsultant, consultantController.moveCandidateToRound);
router.post('/candidates/:applicationId/stage', consultant_auth_middleware_1.authenticateConsultant, consultantController.updateCandidateStage);
// Messaging
router.get('/conversations', consultant_auth_middleware_1.authenticateConsultant, consultantController.listConversations);
router.get('/conversations/:conversationId/messages', consultant_auth_middleware_1.authenticateConsultant, consultantController.getMessages);
router.post('/conversations/:conversationId/messages', consultant_auth_middleware_1.authenticateConsultant, consultantController.sendMessage);
router.patch('/conversations/:conversationId/read', consultant_auth_middleware_1.authenticateConsultant, consultantController.markMessagesRead);
// Commissions & Withdrawals
router.post('/commissions/request', consultant_auth_middleware_1.authenticateConsultant, consultantController.requestCommission);
router.get('/commissions', consultant_auth_middleware_1.authenticateConsultant, consultantController.getCommissions);
router.get('/commissions/balance', consultant_auth_middleware_1.authenticateConsultant, consultantController.getWithdrawalBalance);
router.get('/commissions/withdrawals', consultant_auth_middleware_1.authenticateConsultant, consultantController.getWithdrawals);
router.post('/commissions/withdraw', consultant_auth_middleware_1.authenticateConsultant, consultantController.requestWithdrawal);
router.post('/commissions/withdrawals/:id/cancel', consultant_auth_middleware_1.authenticateConsultant, consultantController.cancelWithdrawal);
router.post('/commissions/withdrawals/:id/execute', consultant_auth_middleware_1.authenticateConsultant, consultantController.executeWithdrawal);
// Performance
router.get('/performance', consultant_auth_middleware_1.authenticateConsultant, consultantController.getPerformance);
router.get('/analytics/dashboard', consultant_auth_middleware_1.authenticateConsultant, consultantController.getDashboardAnalytics);
// Stripe
router.get('/stripe/status', consultant_auth_middleware_1.authenticateConsultant, consultantController.getStripeStatus);
router.post('/stripe/onboard', consultant_auth_middleware_1.authenticateConsultant, consultantController.initiateStripeOnboarding);
router.post('/stripe/login-link', consultant_auth_middleware_1.authenticateConsultant, consultantController.getStripeLoginLink);
exports.default = router;
