import { Router } from 'express';
import { EmailTemplateController } from './email-templates.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new EmailTemplateController();

// Get variables (must come before :id routes)
router.get('/variables', authenticate, controller.getVariables);

// Generate AI template
router.post('/generate-ai', authenticate, controller.generateAITemplate);

// Enhance AI template
router.post('/enhance-ai', authenticate, controller.enhanceTemplate);

// Create template
router.post('/', authenticate, controller.createTemplate);

// Get all templates
router.get('/', authenticate, controller.getTemplates);

// Preview template
router.post('/:id/preview', authenticate, controller.previewTemplate);

// Get single template
router.get('/:id', authenticate, controller.getTemplate);

// Update template
router.put('/:id', authenticate, controller.updateTemplate);

// Delete template
router.delete('/:id', authenticate, controller.deleteTemplate);

export default router;
