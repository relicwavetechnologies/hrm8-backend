import { Router } from 'express';
import { ResumeController } from './resume.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new ResumeController();

router.get('/:resumeId', authenticate, controller.getResume);
router.get('/:resumeId/annotations', authenticate, controller.getAnnotations);
router.post('/:resumeId/annotations', authenticate, controller.createAnnotation);
router.delete('/:resumeId/annotations/:id', authenticate, controller.deleteAnnotation);

export default router;
