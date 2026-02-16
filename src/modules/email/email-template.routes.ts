
import { Router } from 'express';
import { EmailTemplateController } from './email-template.controller';
import { authenticateUnified } from '../../middlewares/unified-auth.middleware';

const router = Router();

router.get('/variables', authenticateUnified as any, EmailTemplateController.getVariables as any);
router.post('/', authenticateUnified as any, EmailTemplateController.create as any);
router.get('/', authenticateUnified as any, EmailTemplateController.getAll as any);
router.get('/:id', authenticateUnified as any, EmailTemplateController.getOne as any);
router.put('/:id', authenticateUnified as any, EmailTemplateController.update as any);
router.delete('/:id', authenticateUnified as any, EmailTemplateController.delete as any);
router.post('/:id/preview', authenticateUnified as any, EmailTemplateController.preview as any);
router.post('/:id/send-test', authenticateUnified as any, EmailTemplateController.sendTest as any);

export default router;
