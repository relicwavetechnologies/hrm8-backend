import { Router } from 'express';
import { AssessmentController } from './assessment.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const assessmentController = new AssessmentController();

// Manual invite (MUST be before /:token routes)
router.post('/invite', authenticate, assessmentController.inviteCandidate as any);

// Public routes (Candidate portal)
router.get('/:token', assessmentController.getAssessmentByToken as any);
router.post('/:token/start', assessmentController.startAssessment as any);
router.post('/:token/save', assessmentController.saveResponse as any);
router.post('/:token/submit', assessmentController.submitAssessment as any);

// Recruiter routes
router.get('/:id/grading', authenticate, assessmentController.getGrading as any);
router.post('/:id/grade', authenticate, assessmentController.saveGrade as any);
router.post('/:id/vote', authenticate, assessmentController.saveVote as any);
router.post('/:id/comment', authenticate, assessmentController.saveComment as any);
router.post('/:id/finalize', authenticate, assessmentController.finalizeAssessment as any);

// Resend
router.post('/:id/resend', authenticate, assessmentController.resendInvitation as any);

export default router;

