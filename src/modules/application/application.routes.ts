import { Router } from 'express';
import { ApplicationController } from './application.controller';
import { CommunicationController } from '../communication/communication.controller';
import { ApplicationTaskController } from '../task/application-task.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authenticateUnified } from '../../middlewares/unified-auth.middleware';

const router = Router();
const applicationController = new ApplicationController();
const communicationController = new CommunicationController();
const taskController = new ApplicationTaskController();

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

// Communication Routes - Call Logs
router.post('/:id/calls', authenticate, communicationController.logCall);
router.get('/:id/calls', authenticate, communicationController.getCallLogs);

// Communication Routes - Email
router.get('/:id/email-threads', authenticate, communicationController.getGmailThreads);
router.post('/:id/emails', authenticate, communicationController.sendEmail);
router.get('/:id/emails', authenticate, communicationController.getEmailLogs);
router.post('/:id/emails/generate', authenticate, communicationController.generateEmailWithAI);
router.post('/:id/email-reply', authenticate, communicationController.replyEmail);
router.post('/:id/email-reply/rewrite', authenticate, communicationController.rewriteEmailReply);

// Communication Routes - SMS
router.post('/:id/sms', authenticate, communicationController.sendSms);
router.get('/:id/sms', authenticate, communicationController.getSmsLogs);

// Communication Routes - Slack
router.post('/:id/slack', authenticate, communicationController.sendSlackMessage);
router.get('/:id/slack', authenticate, communicationController.getSlackLogs);

// Notes Routes
router.get('/:id/notes', authenticate, applicationController.getNotes);
router.post('/:id/notes', authenticate, applicationController.addNote);

// Interview Routes
router.post('/:id/interviews', authenticate, applicationController.scheduleInterview);
router.get('/:id/interviews', authenticate, applicationController.getInterviews);
router.put('/:id/interviews/:interviewId', authenticate, applicationController.updateInterview);
router.post('/:id/interviews/:interviewId/cancel', authenticate, applicationController.cancelInterview);

// Interview Note Routes
router.post('/:id/interviews/:interviewId/notes', authenticate, applicationController.addInterviewNote);
router.get('/:id/interviews/:interviewId/notes', authenticate, applicationController.getInterviewNotes);
router.delete('/:id/interviews/:interviewId/notes/:noteId', authenticate, applicationController.deleteInterviewNote);

// Task Routes
router.post('/:id/tasks', authenticate, taskController.createTask);
router.get('/:id/tasks/stats', authenticate, taskController.getTaskStats);
router.get('/:id/tasks', authenticate, taskController.getTasks);
router.put('/:id/tasks/:taskId', authenticate, taskController.updateTask);
router.delete('/:id/tasks/:taskId', authenticate, taskController.deleteTask);

export default router;
