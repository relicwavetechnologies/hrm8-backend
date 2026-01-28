import { Router } from 'express';
import { PublicController } from './public.controller';

const router = Router();
const publicController = new PublicController();

// Public Job Board Endpoints
router.get('/jobs', publicController.getJobs);
router.get('/jobs/:id', publicController.getJobDetails);
router.get('/jobs/filters', publicController.getJobFilters);
router.get('/jobs/aggregations', publicController.getJobAggregations);
router.get('/jobs/:jobId/application-form', publicController.getJobApplicationForm);
router.get('/jobs/:jobId/related', publicController.getRelatedJobs);
router.post('/jobs/:jobId/track', publicController.trackAnalytics);

// Careers Pages
router.get('/careers/companies', publicController.getCareersCompanies);
router.get('/careers/companies/:id', publicController.getCompanyCareersPage);

// Company Public Info
router.get('/companies/:domain/jobs', publicController.getCompanyJobsByDomain);
router.get('/companies/:domain/branding', publicController.getCompanyBranding);

// Categories
router.get('/categories', publicController.getPublicCategories);

export default router;
