import { Router } from 'express';
import { PublicController } from './public.controller';

const router = Router();
const publicController = new PublicController();

// Public Careers/Company Endpoints
router.get('/companies', publicController.getCompanies);
router.get('/companies/:id', publicController.getCompanyDetails);
router.get('/companies/:id/jobs', publicController.getCompanyJobs);

// Public Job Board Endpoints
router.get('/jobs/filters', publicController.getFilters);
router.get('/jobs/aggregations', publicController.getAggregations);
router.get('/jobs', publicController.getJobs);
router.get('/jobs/:id', publicController.getJobDetails);
router.get('/jobs/:id/related', publicController.getRelatedJobs);
router.get('/jobs/:jobId/application-form', publicController.getApplicationForm);
router.post('/jobs/:id/track', publicController.trackJobView);
router.get('/jobtarget/questionnaire/:jobId', publicController.getJobTargetQuestionnaire);
router.post('/jobtarget/questionnaire/:jobId', publicController.getJobTargetQuestionnaire);
router.post('/jobtarget/application-delivery/:jobId', publicController.receiveJobTargetApplicationDelivery);

// Public Application Endpoints
router.post('/applications/guest', publicController.submitGuestApplication);

export default router;
