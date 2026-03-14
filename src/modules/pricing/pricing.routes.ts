import { Router } from 'express';
import { PricingController } from './pricing.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateUnified } from '../../middlewares/unified-auth.middleware';

const router = Router();

// Available currencies - accessible by both company users and consultants (first-login setup)
router.get('/available-currencies', authenticateUnified, PricingController.getAvailableCurrencies);

// All other pricing routes require company authentication
router.use(authenticate);

// Get subscription tiers for current company
router.get('/subscription-tiers', PricingController.getSubscriptionTiers);

// Get recruitment service prices
router.get('/recruitment-services', PricingController.getRecruitmentServices);

// Get executive search bands
router.get('/executive-search-bands', PricingController.getExecutiveSearchBands);

// Calculate job price based on salary
router.post('/calculate-job-price', PricingController.calculateJobPrice);

// Get company currency info
router.get('/company-currency', PricingController.getCompanyCurrency);

// Get pricing audit (admin only)
router.get('/audit/:companyId', PricingController.getPricingAudit);

export default router;
