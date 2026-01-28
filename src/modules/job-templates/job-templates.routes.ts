import { Router } from 'express';
import { JobTemplatesController } from './job-templates.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new JobTemplatesController();

// All job template routes require authentication
router.use(authenticate);

// Create template from existing job
router.post('/from-job/:jobId', controller.createFromJob);

// Create new template manually
router.post('/', controller.createTemplate);

// Get all templates for the company
router.get('/', controller.getTemplates);

// Get specific template
router.get('/:id', controller.getTemplate);

// Get only the job data from a template
router.get('/:id/job-data', controller.getTemplateJobData);

// Update template
router.put('/:id', controller.updateTemplate);

// Delete template
router.delete('/:id', controller.deleteTemplate);

// Record template usage
router.post('/:id/use', controller.recordUsage);

export default router;
