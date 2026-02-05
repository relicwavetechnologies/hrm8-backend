import { Router } from 'express';
import { AssessmentController } from './assessment.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';

const router = Router();
const assessmentController = new AssessmentController();

// Manual invite (MUST be before /:token routes)
router.post('/invite', authenticate, assessmentController.inviteCandidate);

// Public routes (Candidate portal)
router.get('/:token', assessmentController.getAssessmentByToken);
router.post('/:token/start', assessmentController.startAssessment);
router.post('/:token/save', assessmentController.saveResponse);
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

// Legacy grading endpoints
router.get('/:id/legacy-grading', authenticate, assessmentController.getGrading);
router.post('/:id/legacy-grade', authenticate, assessmentController.saveGrade);
router.post('/:id/legacy-comment', authenticate, assessmentController.saveComment);
router.post('/:id/legacy-finalize', authenticate, assessmentController.finalizeAssessment);
router.post('/:id/legacy-resend', authenticate, assessmentController.resendInvitation);

export default router;
