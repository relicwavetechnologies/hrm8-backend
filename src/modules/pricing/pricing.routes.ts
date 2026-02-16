import { Router } from 'express';
import { PricingController } from './pricing.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// All pricing routes require authentication
router.use(authenticate);

// Get subscription tiers for current company
router.get('/subscription-tiers', PricingController.getSubscriptionTiers as any);

// Get recruitment service prices
router.get('/recruitment-services', PricingController.getRecruitmentServices as any);

// Get executive search bands
router.get('/executive-search-bands', PricingController.getExecutiveSearchBands as any);

// Calculate job price based on salary
router.post('/calculate-job-price', PricingController.calculateJobPrice as any);

// Get company currency info
router.get('/company-currency', PricingController.getCompanyCurrency as any);

// Get pricing audit (admin only)
router.get('/audit/:companyId', PricingController.getPricingAudit as any);

export default router;
