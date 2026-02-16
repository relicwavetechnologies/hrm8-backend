import { Router } from 'express';
import { ApplicationController } from './application.controller';
import { CommunicationController } from '../communication/communication.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateUnified } from '../../middlewares/unified-auth.middleware';

const router = Router();
const applicationController = new ApplicationController();
const communicationController = new CommunicationController();

// Bulk operations - must come before parameterized routes
router.post('/bulk-score', authenticate, applicationController.bulkScoreCandidates as any);
router.post('/bulk-analyze', authenticate, applicationController.bulkAiAnalysis as any);

// Check if candidate has applied
router.get('/check', authenticateUnified, applicationController.checkApplication as any);

// Get job applications (CRITICAL for /ats/jobs page)
router.get('/job/:jobId', authenticate, applicationController.getJobApplications as any);

// Get application count for job
router.get('/count/:jobId', authenticate, applicationController.getApplicationCountForJob as any);

// Application submission
router.post('/', authenticateUnified, applicationController.submitApplication as any);

// Get candidate applications (with candidateId query param)
router.get('/', authenticateUnified, applicationController.getCandidateApplications as any);

// Bulk operations - must come before parameterized routes
router.post('/manual', authenticate, applicationController.submitManualApplication as any);
router.post('/from-talent-pool', authenticate, applicationController.addFromTalentPool as any);
router.put('/:id/manual-screening', authenticate, applicationController.updateManualScreening as any);

// Single application operations - must come after specific routes
router.get('/:id/resume', authenticateUnified, applicationController.getResume as any);
router.get('/:id', authenticateUnified, applicationController.getApplication as any);
router.put('/:id/round/:roundId', authenticate, applicationController.moveToRound as any);
router.put('/:id/score', authenticate, applicationController.updateScore as any);
router.put('/:id/rank', authenticate, applicationController.updateRank as any);
router.put('/:id/tags', authenticate, applicationController.updateTags as any);
router.post('/:id/shortlist', authenticate, applicationController.shortlistCandidate as any);
router.post('/:id/unshortlist', authenticate, applicationController.unshortlistCandidate as any);
router.put('/:id/stage', authenticate, applicationController.updateStage as any);
router.put('/:id/notes', authenticate, applicationController.updateNotes as any);
router.post('/:id/withdraw', authenticateUnified, applicationController.withdrawApplication as any);
router.delete('/:id', authenticate, applicationController.deleteApplication as any);
router.put('/:id/read', authenticate, applicationController.markAsRead as any);

// Evaluation Routes
router.post('/:id/evaluate', authenticate, applicationController.addEvaluation as any);
router.get('/:id/evaluations', authenticate, applicationController.getEvaluations as any);

// Communication Routes - Call Logs
router.post('/:id/calls', authenticate, communicationController.logCall as any);
router.get('/:id/calls', authenticate, communicationController.getCallLogs as any);

// Communication Routes - Email
router.post('/:id/emails', authenticate, communicationController.sendEmail as any);
router.get('/:id/emails', authenticate, communicationController.getEmailLogs as any);
router.post('/:id/emails/generate', authenticate, communicationController.generateEmailWithAI as any);

// Communication Routes - SMS
router.post('/:id/sms', authenticate, communicationController.sendSms as any);
router.get('/:id/sms', authenticate, communicationController.getSmsLogs as any);

// Communication Routes - Slack
router.post('/:id/slack', authenticate, communicationController.sendSlackMessage as any);
router.get('/:id/slack', authenticate, communicationController.getSlackLogs as any);

// Notes Routes
router.get('/:id/notes', authenticate, applicationController.getNotes as any);
router.post('/:id/notes', authenticate, applicationController.addNote as any);


export default router;
