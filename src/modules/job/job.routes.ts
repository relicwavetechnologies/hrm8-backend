import { Router } from 'express';
import { JobController } from './job.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const jobController = new JobController();

router.post('/', authenticate, jobController.createJob);
router.get('/', authenticate, jobController.getJobs);
router.get('/:id', authenticate, jobController.getJob);
router.put('/:id', authenticate, jobController.updateJob);
router.delete('/:id', authenticate, jobController.deleteJob);

export default router;
