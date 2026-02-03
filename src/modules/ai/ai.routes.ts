
import { Router } from 'express';
import { EmailTemplateAIController } from './email-template-ai.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// Email Template AI Routes
router.post('/templates/generate', authenticate, EmailTemplateAIController.generateTemplate);
router.post('/templates/rewrite', authenticate, EmailTemplateAIController.rewriteText);

export default router;
