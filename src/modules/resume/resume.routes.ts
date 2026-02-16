import { Router } from 'express';
import { ResumeController } from './resume.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const resumeController = new ResumeController();

// All routes require authentication
router.use(authenticate);

// GET /api/resumes/:resumeId - Get resume by ID
router.get('/:resumeId', resumeController.getResume as any);

// GET /api/resumes/:resumeId/annotations - Get annotations for a resume
router.get('/:resumeId/annotations', resumeController.getAnnotations as any);

// POST /api/resumes/:resumeId/annotations - Create annotation
router.post('/:resumeId/annotations', resumeController.createAnnotation as any);

// DELETE /api/resumes/:resumeId/annotations/:id - Delete annotation
router.delete('/:resumeId/annotations/:id', resumeController.deleteAnnotation as any);

export default router;
