import { Router } from 'express';
import { PublicController } from './public.controller';

const router = Router();
const publicController = new PublicController();

// Public Job Board Endpoints
router.get('/jobs/filters', publicController.getFilters as any);
router.get('/jobs/aggregations', publicController.getAggregations as any);
router.get('/jobs', publicController.getJobs as any);
router.get('/jobs/:id', publicController.getJobDetails as any);
router.get('/jobs/:id/related', publicController.getRelatedJobs as any);
router.get('/jobs/:jobId/application-form', publicController.getApplicationForm as any);
router.post('/jobs/:id/track', publicController.trackJobView as any);

// Public Application Endpoints
router.post('/applications/guest', publicController.submitGuestApplication as any);

export default router;
