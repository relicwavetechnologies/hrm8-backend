import { Router } from 'express';
import { PublicController } from './public.controller';

const router = Router();
const publicController = new PublicController();

// Public Job Board Endpoints
router.get('/jobs/filters', publicController.getFilters);
router.get('/jobs/aggregations', publicController.getAggregations);
router.get('/jobs', publicController.getJobs);
router.get('/jobs/:id', publicController.getJobDetails);
router.get('/jobs/:id/related', publicController.getRelatedJobs);
router.post('/jobs/:id/track', publicController.trackJobView);

export default router;
