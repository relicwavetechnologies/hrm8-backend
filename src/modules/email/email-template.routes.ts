
import { Router } from 'express';
import { EmailTemplateController } from './email-template.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticate, EmailTemplateController.create);
router.get('/', authenticate, EmailTemplateController.getAll);
router.get('/:id', authenticate, EmailTemplateController.getOne);
router.put('/:id', authenticate, EmailTemplateController.update);
router.delete('/:id', authenticate, EmailTemplateController.delete);
router.post('/:id/send-test', authenticate, EmailTemplateController.sendTest);

export default router;
