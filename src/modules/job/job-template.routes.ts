import { Router } from 'express';
import { JobTemplateController } from './job-template.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new JobTemplateController();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.get('/:id/job-data', authenticate, controller.getTemplateJobData);
router.post('/', authenticate, controller.create);
router.post('/from-job/:id', authenticate, controller.createFromJob);
router.post('/generate-ai', authenticate, controller.generateAI);
router.post('/:id/use', authenticate, controller.use);
router.delete('/:id', authenticate, controller.delete);

export default router;
