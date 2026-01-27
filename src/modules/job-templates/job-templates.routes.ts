import { Router } from 'express';
import { JobTemplateController } from './job-templates.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new JobTemplateController();

// Create template from existing job
router.post('/from-job/:jobId', authenticate, controller.createFromJob);

// Create new template
router.post('/', authenticate, controller.createTemplate);

// Get all templates
router.get('/', authenticate, controller.getTemplates);

// Get single template
router.get('/:id', authenticate, controller.getTemplate);

// Get template job data
router.get('/:id/job-data', authenticate, controller.getTemplateJobData);

// Update template
router.put('/:id', authenticate, controller.updateTemplate);

// Delete template
router.delete('/:id', authenticate, controller.deleteTemplate);

export default router;
