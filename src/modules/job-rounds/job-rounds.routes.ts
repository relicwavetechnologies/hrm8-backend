import { Router } from 'express';
import { JobRoundController } from './job-rounds.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new JobRoundController();

router.get('/job/:jobId', authenticate, controller.getJobRounds);
router.get('/:id', authenticate, controller.getRound);
router.post('/', authenticate, controller.createRound);
router.put('/:id', authenticate, controller.updateRound);
router.delete('/:id', authenticate, controller.deleteRound);

export default router;
