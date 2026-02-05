import { Router } from 'express';
import { ApplicationController } from './application.controller';
import multer from 'multer';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateCandidate } from '../../middlewares/candidate-auth.middleware';

const router = Router();
const applicationController = new ApplicationController();
const upload = multer({ storage: multer.memoryStorage() });

// --- Public Routes ---
router.post('/anonymous', applicationController.submitAnonymousApplication);

// --- Candidate Routes ---
router.post('/accept-invitation', authenticateCandidate, applicationController.acceptJobInvitation);

// Bulk operations (must come before parameterized routes)
router.post('/bulk-score', authenticate, applicationController.bulkScoreCandidates);
router.post('/bulk-analyze', authenticate, applicationController.bulkAiAnalysis);

// --- Shared/Unified Routes ---
router.get('/check', unifiedAuthenticate, applicationController.checkApplication);
router.get('/check/:jobId/:candidateId', unifiedAuthenticate, applicationController.checkApplication);
router.get('/job/:jobId', unifiedAuthenticate, applicationController.getJobApplications);
router.get('/count/:jobId', unifiedAuthenticate, applicationController.getApplicationCountForJob);

// Application submission & retrieval
router.post('/', unifiedAuthenticate, applicationController.submitApplication);
router.get('/', unifiedAuthenticate, applicationController.getCandidateApplications);

// Uploads
router.post('/upload', unifiedAuthenticate, upload.single('file'), applicationController.uploadFile);
router.delete('/upload/:publicId', unifiedAuthenticate, applicationController.deleteFile);

// Admin/Recruiter Only Routes
router.get('/admin/:id', authenticate, applicationController.getApplicationForAdmin);
router.get('/:id/resume', unifiedAuthenticate, applicationController.getResume);
router.post('/manual', authenticate, applicationController.createManualApplication);
router.post('/from-talent-pool', authenticate, applicationController.addFromTalentPool);
router.put('/:id/round/:roundId', authenticate, applicationController.moveToRound);
router.put('/:id/manual-screening', authenticate, applicationController.updateManualScreening);

// Single application operations
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

// Evaluation Routes
router.post('/:id/evaluate', authenticate, applicationController.addEvaluation);
router.get('/:id/evaluations', authenticate, applicationController.getEvaluations);

export default router;
