"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("./company.controller");
const subscription_controller_1 = require("../subscription/subscription.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const companyController = new company_controller_1.CompanyController();
const subscriptionController = new subscription_controller_1.SubscriptionController();
// Public Routes (if any, e.g., lookup by domain)
// router.get('/lookup', companyController.lookup);
// Protected Routes
router.get('/:id', auth_middleware_1.authenticate, companyController.getCompany);
router.put('/:id', auth_middleware_1.authenticate, companyController.updateCompany);
// Profile
router.get('/:id/profile', auth_middleware_1.authenticate, companyController.getProfile);
router.put('/:id/profile', auth_middleware_1.authenticate, companyController.updateProfile);
// Settings
router.get('/:id/job-assignment-settings', auth_middleware_1.authenticate, companyController.getJobAssignmentSettings);
router.put('/:id/job-assignment-mode', auth_middleware_1.authenticate, companyController.updateJobAssignmentMode);
// Stats
router.get('/:id/stats', auth_middleware_1.authenticate, companyController.getStats);
router.get('/:id/subscription/active', auth_middleware_1.authenticate, subscriptionController.getActive);
// Transactions
router.get('/transactions', auth_middleware_1.authenticate, companyController.getTransactions);
router.get('/transactions/stats', auth_middleware_1.authenticate, companyController.getTransactionStats);
// Refund Requests
router.post('/refund-requests', auth_middleware_1.authenticate, companyController.createRefundRequest);
router.get('/refund-requests', auth_middleware_1.authenticate, companyController.getRefundRequests);
router.delete('/refund-requests/:id', auth_middleware_1.authenticate, companyController.cancelRefundRequest);
router.put('/refund-requests/:id/withdraw', auth_middleware_1.authenticate, companyController.withdrawRefundRequest);
exports.default = router;
