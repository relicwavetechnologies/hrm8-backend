import { Router } from 'express';
import { ApplicationController } from './application.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateUnified } from '../../middlewares/unified-auth.middleware';

const router = Router();
const applicationController = new ApplicationController();

// Bulk operations - must come before parameterized routes
router.post('/bulk-score', authenticate, applicationController.bulkScoreCandidates);
router.post('/bulk-analyze', authenticate, applicationController.bulkAiAnalysis);

// Check if candidate has applied
router.get('/check', authenticateUnified, applicationController.checkApplication);

// Get job applications (CRITICAL for /ats/jobs page)
router.get('/job/:jobId', authenticate, applicationController.getJobApplications);

// Get application count for job
router.get('/count/:jobId', authenticate, applicationController.getApplicationCountForJob);

// Application submission
router.post('/', authenticateUnified, applicationController.submitApplication);

// Get candidate applications (with candidateId query param)
router.get('/', authenticateUnified, applicationController.getCandidateApplications);

// Bulk operations - must come before parameterized routes
router.post('/manual', authenticate, applicationController.submitManualApplication);
router.post('/from-talent-pool', authenticate, applicationController.addFromTalentPool);
router.put('/:id/manual-screening', authenticate, applicationController.updateManualScreening);

// Single application operations - must come after specific routes
router.get('/:id/resume', authenticateUnified, applicationController.getResume);
router.get('/:id', authenticateUnified, applicationController.getApplication);
router.put('/:id/round/:roundId', authenticate, applicationController.moveToRound);
router.put('/:id/score', authenticate, applicationController.updateScore);
router.put('/:id/rank', authenticate, applicationController.updateRank);
router.put('/:id/tags', authenticate, applicationController.updateTags);
router.post('/:id/shortlist', authenticate, applicationController.shortlistCandidate);
router.post('/:id/unshortlist', authenticate, applicationController.unshortlistCandidate);
router.put('/:id/stage', authenticate, applicationController.updateStage);
router.put('/:id/notes', authenticate, applicationController.updateNotes);
router.post('/:id/withdraw', authenticateUnified, applicationController.withdrawApplication);
router.delete('/:id', authenticate, applicationController.deleteApplication);
router.put('/:id/read', authenticate, applicationController.markAsRead);

// Evaluation Routes
router.post('/:id/evaluate', authenticate, applicationController.addEvaluation);
router.get('/:id/evaluations', authenticate, applicationController.getEvaluations);

// Notes Routes
router.get('/:id/notes', authenticate, applicationController.getNotes);
router.post('/:id/notes', authenticate, applicationController.addNote);

export default router;
