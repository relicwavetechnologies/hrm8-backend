import { Router } from 'express';
import { AssessmentController } from './assessment.controller';

const router = Router();
const assessmentController = new AssessmentController();

// Public routes (Candidate portal)
router.get('/:token', assessmentController.getAssessmentByToken);
router.post('/:token/start', assessmentController.startAssessment);
router.post('/:token/submit', assessmentController.submitAssessment);

export default router;
