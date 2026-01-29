import { Router } from 'express';
import { AssessmentController } from './assessment.controller';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';

const router = Router();
const assessmentController = new AssessmentController();

// Public routes (Candidate portal - Unauthenticated or Token-based)
router.get('/:token', assessmentController.getAssessmentByToken);
router.post('/:token/start', assessmentController.startAssessment);
router.post('/:token/submit', assessmentController.submitAssessment);

// Authenticated routes (Staff or Candidate)
router.use(unifiedAuthenticate);

router.get('/', assessmentController.getCandidateAssessments);

router.get('/:id/results', assessmentController.getAssessmentResults);
router.get('/:id/grading', assessmentController.getAssessmentForGrading);
router.post('/:id/resend', assessmentController.resendAssessmentInvitation);
router.post('/grade', assessmentController.gradeResponse);
router.post('/:id/comment', assessmentController.addAssessmentComment);
router.post('/:id/score', assessmentController.scoreAssessment);

export default router;
