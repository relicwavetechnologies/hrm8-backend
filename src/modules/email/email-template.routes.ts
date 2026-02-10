
import { Router } from 'express';
import { EmailTemplateController } from './email-template.controller';
import { authenticateUnified } from '../../middlewares/unified-auth.middleware';

const router = Router();

router.get('/variables', authenticateUnified as any, EmailTemplateController.getVariables);
router.post('/', authenticateUnified as any, EmailTemplateController.create);
router.get('/', authenticateUnified as any, EmailTemplateController.getAll);
router.get('/:id', authenticateUnified as any, EmailTemplateController.getOne);
router.put('/:id', authenticateUnified as any, EmailTemplateController.update);
router.delete('/:id', authenticateUnified as any, EmailTemplateController.delete);
router.post('/:id/preview', authenticateUnified as any, EmailTemplateController.preview);
router.post('/:id/send-test', authenticateUnified as any, EmailTemplateController.sendTest);

export default router;
