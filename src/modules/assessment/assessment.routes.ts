import { Router } from 'express';
import { AssessmentController } from './assessment.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const assessmentController = new AssessmentController();

// Manual invite (MUST be before /:token routes)
router.post('/invite', authenticate, assessmentController.inviteCandidate);

// Public routes (Candidate portal)
router.get('/:token', assessmentController.getAssessmentByToken);
router.post('/:token/start', assessmentController.startAssessment);
router.post('/:token/save', assessmentController.saveResponse);
router.post('/:token/submit', assessmentController.submitAssessment);

// Recruiter routes
router.get('/:id/grading', authenticate, assessmentController.getGrading);
router.post('/:id/grade', authenticate, assessmentController.saveGrade);
router.post('/:id/comment', authenticate, assessmentController.saveComment);
router.post('/:id/finalize', authenticate, assessmentController.finalizeAssessment);

// Resend
router.post('/:id/resend', authenticate, assessmentController.resendInvitation);

export default router;

