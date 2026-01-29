import { Router } from 'express';
import { ApplicationController } from './application.controller';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';

const router = Router();
const applicationController = new ApplicationController();

// Bulk operations - must come before parameterized routes
router.get('/bulk-score', unifiedAuthenticate, applicationController.bulkScoreCandidates);

// Check if candidate has applied
router.get('/check', unifiedAuthenticate, applicationController.checkApplication);

// Get job applications (CRITICAL for /ats/jobs page)
router.get('/job/:jobId', unifiedAuthenticate, applicationController.getJobApplications);

// Get application count for job
router.get('/count/:jobId', unifiedAuthenticate, applicationController.getApplicationCountForJob);

// Application submission
router.post('/', unifiedAuthenticate, applicationController.submitApplication);

// Get candidate applications (with candidateId query param)
router.get('/', unifiedAuthenticate, applicationController.getCandidateApplications);

// Single application operations - must come after specific routes
router.get('/:id', unifiedAuthenticate, applicationController.getApplication);
router.put('/:id/score', unifiedAuthenticate, applicationController.updateScore);
router.put('/:id/rank', unifiedAuthenticate, applicationController.updateRank);
router.put('/:id/tags', unifiedAuthenticate, applicationController.updateTags);
router.post('/:id/shortlist', unifiedAuthenticate, applicationController.shortlistCandidate);
router.post('/:id/unshortlist', unifiedAuthenticate, applicationController.unshortlistCandidate);
router.put('/:id/stage', unifiedAuthenticate, applicationController.updateStage);
router.put('/:id/notes', unifiedAuthenticate, applicationController.updateNotes);
router.post('/:id/withdraw', unifiedAuthenticate, applicationController.withdrawApplication);
router.delete('/:id', unifiedAuthenticate, applicationController.deleteApplication);
router.put('/:id/read', unifiedAuthenticate, applicationController.markAsRead);

export default router;
