"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("./company.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.get('/:id', company_controller_1.companyController.getCompany);
router.get('/:id/verification-status', company_controller_1.companyController.getVerificationStatus);
router.post('/:id/verify/email', company_controller_1.companyController.verifyByEmail);
router.post('/:id/verify/manual', company_controller_1.companyController.initiateManualVerification);
// Profile routes
router.get('/:id/profile', company_controller_1.companyController.getProfile);
router.put('/:id/profile', auth_middleware_1.authenticate, company_controller_1.companyController.updateProfile);
router.post('/:id/profile/complete', company_controller_1.companyController.completeProfile);
// Settings routes
router.get('/:id/job-assignment-settings', company_controller_1.companyController.getJobAssignmentSettings);
router.put('/:id/job-assignment-mode', auth_middleware_1.authenticate, company_controller_1.companyController.updateJobAssignmentMode);
// Stats routes
router.get('/:id/stats', auth_middleware_1.authenticate, company_controller_1.companyController.getCompanyStats);
exports.default = router;
