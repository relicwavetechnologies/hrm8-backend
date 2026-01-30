import { Router } from 'express';
import { ApplicationController } from './application.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const applicationController = new ApplicationController();

// Bulk operations - must come before parameterized routes
router.post('/bulk-score', authenticate, applicationController.bulkScoreCandidates);

// Check if candidate has applied
router.get('/check', authenticate, applicationController.checkApplication);

// Get job applications (CRITICAL for /ats/jobs page)
router.get('/job/:jobId', authenticate, applicationController.getJobApplications);

// Get application count for job
router.get('/count/:jobId', authenticate, applicationController.getApplicationCountForJob);

// Application submission
router.post('/', authenticate, applicationController.submitApplication);

// Get candidate applications (with candidateId query param)
router.get('/', authenticate, applicationController.getCandidateApplications);

// Bulk operations - must come before parameterized routes
router.post('/manual', authenticate, applicationController.submitManualApplication);
router.post('/from-talent-pool', authenticate, applicationController.addFromTalentPool);
router.put('/:id/manual-screening', authenticate, applicationController.updateManualScreening);

// Single application operations - must come after specific routes
router.get('/:id/resume', authenticate, applicationController.getResume);
router.get('/:id', authenticate, applicationController.getApplication);
router.put('/:id/round/:roundId', authenticate, applicationController.moveToRound);
router.put('/:id/score', authenticate, applicationController.updateScore);
router.put('/:id/rank', authenticate, applicationController.updateRank);
router.put('/:id/tags', authenticate, applicationController.updateTags);
router.post('/:id/shortlist', authenticate, applicationController.shortlistCandidate);
router.post('/:id/unshortlist', authenticate, applicationController.unshortlistCandidate);
router.put('/:id/stage', authenticate, applicationController.updateStage);
router.put('/:id/notes', authenticate, applicationController.updateNotes);
router.post('/:id/withdraw', authenticate, applicationController.withdrawApplication);
router.delete('/:id', authenticate, applicationController.deleteApplication);
router.put('/:id/read', authenticate, applicationController.markAsRead);

export default router;
