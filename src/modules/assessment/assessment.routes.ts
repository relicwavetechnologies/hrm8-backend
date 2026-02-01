import { Router } from 'express';
import { AssessmentController } from './assessment.controller';

const router = Router();
const assessmentController = new AssessmentController();

// Public routes (Candidate portal)
router.get('/:token', assessmentController.getAssessmentByToken);
router.post('/:token/start', assessmentController.startAssessment);
router.post('/:token/submit', assessmentController.submitAssessment);

// Recruiter// Grading
router.get('/:id/grading', assessmentController.getGrading);
router.post('/:id/grade', assessmentController.saveGrade);
router.post('/:id/comment', assessmentController.saveComment);
router.post('/:id/finalize', assessmentController.finalizeAssessment);

// Resend
router.post('/:id/resend', assessmentController.resendInvitation);

export default router;
