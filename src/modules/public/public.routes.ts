import { Router } from 'express';
import { PublicController } from './public.controller';

const router = Router();
const publicController = new PublicController();

// Public Job Board Endpoints
router.get('/jobs', publicController.getJobs);
router.get('/jobs/:id', publicController.getJobDetails);

export default router;
