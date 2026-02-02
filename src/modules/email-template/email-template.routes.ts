import { Router } from 'express';
import { EmailTemplateController } from './email-template.controller';
import { authenticateHrm8 } from '../../middlewares/hrm8-auth.middleware';

const router = Router();
const controller = new EmailTemplateController();

router.get('/', authenticateHrm8, controller.getAll);
router.post('/', authenticateHrm8, controller.create);
router.put('/:id', authenticateHrm8, controller.update);
router.delete('/:id', authenticateHrm8, controller.delete);
router.post('/:id/preview', authenticateHrm8, controller.preview);
router.get('/variables', authenticateHrm8, controller.getVariables);

export default router;
