"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pricing_controller_1 = require("./pricing.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// All pricing routes require authentication
router.use(auth_middleware_1.authenticate);
// Get subscription tiers for current company
router.get('/subscription-tiers', pricing_controller_1.PricingController.getSubscriptionTiers);
// Get recruitment service prices
router.get('/recruitment-services', pricing_controller_1.PricingController.getRecruitmentServices);
// Get executive search bands
router.get('/executive-search-bands', pricing_controller_1.PricingController.getExecutiveSearchBands);
// Calculate job price based on salary
router.post('/calculate-job-price', pricing_controller_1.PricingController.calculateJobPrice);
// Get company currency info
router.get('/company-currency', pricing_controller_1.PricingController.getCompanyCurrency);
// Get pricing audit (admin only)
router.get('/audit/:companyId', pricing_controller_1.PricingController.getPricingAudit);
exports.default = router;
