import { Router } from 'express';
import { ApplicationController } from './application.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateCandidate } from '../../middlewares/candidate-auth.middleware';

const router = Router();
const applicationController = new ApplicationController();

// --- Public Routes ---
router.post('/anonymous', applicationController.submitAnonymousApplication);

// --- Candidate Routes ---
router.post('/accept-invitation', authenticateCandidate, applicationController.acceptJobInvitation);
router.post('/', authenticateCandidate, applicationController.submitApplication);
router.post('/:id/withdraw', authenticateCandidate, applicationController.withdrawApplication);

// --- Recruiter/Admin Routes ---

// Bulk operations
router.post('/bulk-score', authenticate, applicationController.bulkScoreCandidates);

// Check if candidate has applied
router.get('/check', authenticate, applicationController.checkApplication);
router.get('/check/:jobId/:candidateId', authenticate, applicationController.checkApplication);

// Get job applications
router.get('/job/:jobId', authenticate, applicationController.getJobApplications);
router.get('/count/:jobId', authenticate, applicationController.getApplicationCountForJob);

// Admin-specific views
router.get('/admin/:id', authenticate, applicationController.getApplicationForAdmin);
router.get('/:id/resume', authenticate, applicationController.getApplicationResume);

// Recruiter actions
router.post('/manual', authenticate, applicationController.createManualApplication);
router.post('/from-talent-pool', authenticate, applicationController.addFromTalentPool);

// Get candidate applications
router.get('/', authenticate, applicationController.getCandidateApplications);

// Single application operations
router.get('/:id', authenticate, applicationController.getApplication);
router.put('/:id/score', authenticate, applicationController.updateScore);
router.put('/:id/rank', authenticate, applicationController.updateRank);
router.put('/:id/tags', authenticate, applicationController.updateTags);
router.post('/:id/shortlist', authenticate, applicationController.shortlistCandidate);
router.post('/:id/unshortlist', authenticate, applicationController.unshortlistCandidate);
router.put('/:id/stage', authenticate, applicationController.updateStage);
router.put('/:id/round/:roundId', authenticate, applicationController.moveToRound);
router.put('/:id/notes', authenticate, applicationController.updateNotes);
router.put('/:id/manual-screening', authenticate, applicationController.updateManualScreening);
router.delete('/:id', authenticate, applicationController.deleteApplication);
router.put('/:id/read', authenticate, applicationController.markAsRead);

export default router;
