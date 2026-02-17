"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const application_controller_1 = require("./application.controller");
const communication_controller_1 = require("../communication/communication.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const unified_auth_middleware_1 = require("../../middlewares/unified-auth.middleware");
const router = (0, express_1.Router)();
const applicationController = new application_controller_1.ApplicationController();
const communicationController = new communication_controller_1.CommunicationController();
// Bulk operations - must come before parameterized routes
router.post('/bulk-score', auth_middleware_1.authenticate, applicationController.bulkScoreCandidates);
router.post('/bulk-analyze', auth_middleware_1.authenticate, applicationController.bulkAiAnalysis);
// Check if candidate has applied
router.get('/check', unified_auth_middleware_1.authenticateUnified, applicationController.checkApplication);
// Get job applications (CRITICAL for /ats/jobs page)
router.get('/job/:jobId', auth_middleware_1.authenticate, applicationController.getJobApplications);
// Get application count for job
router.get('/count/:jobId', auth_middleware_1.authenticate, applicationController.getApplicationCountForJob);
// Application submission
router.post('/', unified_auth_middleware_1.authenticateUnified, applicationController.submitApplication);
// Get candidate applications (with candidateId query param)
router.get('/', unified_auth_middleware_1.authenticateUnified, applicationController.getCandidateApplications);
// Bulk operations - must come before parameterized routes
router.post('/manual', auth_middleware_1.authenticate, applicationController.submitManualApplication);
router.post('/from-talent-pool', auth_middleware_1.authenticate, applicationController.addFromTalentPool);
router.put('/:id/manual-screening', auth_middleware_1.authenticate, applicationController.updateManualScreening);
// Single application operations - must come after specific routes
router.get('/:id/resume', unified_auth_middleware_1.authenticateUnified, applicationController.getResume);
router.get('/:id', unified_auth_middleware_1.authenticateUnified, applicationController.getApplication);
router.put('/:id/round/:roundId', auth_middleware_1.authenticate, applicationController.moveToRound);
router.put('/:id/score', auth_middleware_1.authenticate, applicationController.updateScore);
router.put('/:id/rank', auth_middleware_1.authenticate, applicationController.updateRank);
router.put('/:id/tags', auth_middleware_1.authenticate, applicationController.updateTags);
router.post('/:id/shortlist', auth_middleware_1.authenticate, applicationController.shortlistCandidate);
router.post('/:id/unshortlist', auth_middleware_1.authenticate, applicationController.unshortlistCandidate);
router.put('/:id/stage', auth_middleware_1.authenticate, applicationController.updateStage);
router.put('/:id/notes', auth_middleware_1.authenticate, applicationController.updateNotes);
router.post('/:id/withdraw', unified_auth_middleware_1.authenticateUnified, applicationController.withdrawApplication);
router.delete('/:id', auth_middleware_1.authenticate, applicationController.deleteApplication);
router.put('/:id/read', auth_middleware_1.authenticate, applicationController.markAsRead);
// Evaluation Routes
router.post('/:id/evaluate', auth_middleware_1.authenticate, applicationController.addEvaluation);
router.get('/:id/evaluations', auth_middleware_1.authenticate, applicationController.getEvaluations);
// Communication Routes - Call Logs
router.post('/:id/calls', auth_middleware_1.authenticate, communicationController.logCall);
router.get('/:id/calls', auth_middleware_1.authenticate, communicationController.getCallLogs);
// Communication Routes - Email
router.post('/:id/emails', auth_middleware_1.authenticate, communicationController.sendEmail);
router.get('/:id/emails', auth_middleware_1.authenticate, communicationController.getEmailLogs);
router.post('/:id/emails/generate', auth_middleware_1.authenticate, communicationController.generateEmailWithAI);
// Communication Routes - SMS
router.post('/:id/sms', auth_middleware_1.authenticate, communicationController.sendSms);
router.get('/:id/sms', auth_middleware_1.authenticate, communicationController.getSmsLogs);
// Communication Routes - Slack
router.post('/:id/slack', auth_middleware_1.authenticate, communicationController.sendSlackMessage);
router.get('/:id/slack', auth_middleware_1.authenticate, communicationController.getSlackLogs);
// Notes Routes
router.get('/:id/notes', auth_middleware_1.authenticate, applicationController.getNotes);
router.post('/:id/notes', auth_middleware_1.authenticate, applicationController.addNote);
exports.default = router;
