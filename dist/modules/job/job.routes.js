"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const job_controller_1 = require("./job.controller");
const round_config_controller_1 = require("./round-config.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const job_document_controller_1 = require("./job-document.controller");
const router = (0, express_1.Router)();
const jobController = new job_controller_1.JobController();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post('/', auth_middleware_1.authenticate, jobController.createJob);
router.post('/generate-description', auth_middleware_1.authenticate, jobController.generateDescription);
router.post('/parse-document', auth_middleware_1.authenticate, upload.single('file'), job_document_controller_1.jobDocumentController.parseDocument);
router.get('/', auth_middleware_1.authenticate, jobController.getJobs);
router.post('/bulk-delete', auth_middleware_1.authenticate, jobController.bulkDeleteJobs);
router.post('/bulk-archive', auth_middleware_1.authenticate, jobController.bulkArchiveJobs);
router.post('/bulk-unarchive', auth_middleware_1.authenticate, jobController.bulkUnarchiveJobs);
router.get('/:id', auth_middleware_1.authenticate, jobController.getJob);
router.post('/:id/publish', auth_middleware_1.authenticate, jobController.publishJob);
router.post('/:id/upgrade-managed-service', auth_middleware_1.authenticate, jobController.upgradeToManagedService);
router.post('/:id/submit', auth_middleware_1.authenticate, jobController.submitAndActivate); // Legacy wizard endpoint -> centralized publish flow
// Round Email Config Routes
router.get('/:jobId/rounds/:roundId/email-config', auth_middleware_1.authenticate, round_config_controller_1.RoundConfigController.getEmailConfig);
router.put('/:jobId/rounds/:roundId/email-config', auth_middleware_1.authenticate, round_config_controller_1.RoundConfigController.updateEmailConfig);
// Round Offer Config Routes
router.get('/:jobId/rounds/:roundId/offer-config', auth_middleware_1.authenticate, round_config_controller_1.RoundConfigController.getOfferConfig);
router.put('/:jobId/rounds/:roundId/offer-config', auth_middleware_1.authenticate, round_config_controller_1.RoundConfigController.updateOfferConfig);
router.post('/:id/save-draft', auth_middleware_1.authenticate, jobController.saveDraft);
router.post('/:id/save-template', auth_middleware_1.authenticate, jobController.saveTemplate);
router.post('/:id/save-as-template', auth_middleware_1.authenticate, jobController.saveAsTemplate);
router.post('/:id/archive', auth_middleware_1.authenticate, jobController.archiveJob);
router.post('/:id/unarchive', auth_middleware_1.authenticate, jobController.unarchiveJob);
router.put('/:id/alerts', auth_middleware_1.authenticate, jobController.updateAlerts);
router.put('/:id', auth_middleware_1.authenticate, jobController.updateJob);
router.delete('/:id', auth_middleware_1.authenticate, jobController.deleteJob);
// Job Rounds
router.get('/:id/rounds', auth_middleware_1.authenticate, jobController.getJobRounds);
router.post('/:id/rounds', auth_middleware_1.authenticate, jobController.createJobRound);
router.put('/:id/rounds/:roundId', auth_middleware_1.authenticate, jobController.updateJobRound);
router.delete('/:id/rounds/:roundId', auth_middleware_1.authenticate, jobController.deleteJobRound);
// Interview Configuration
router.get('/:id/rounds/:roundId/interview-config', auth_middleware_1.authenticate, jobController.getInterviewConfig);
router.post('/:id/rounds/:roundId/interview-config', auth_middleware_1.authenticate, jobController.configureInterview);
// Assessment Configuration
router.get('/:id/rounds/:roundId/assessment-config', auth_middleware_1.authenticate, jobController.getAssessmentConfig);
router.post('/:id/rounds/:roundId/assessment-config', auth_middleware_1.authenticate, jobController.configureAssessment);
router.get('/:id/rounds/:roundId/assessments', auth_middleware_1.authenticate, jobController.getRoundAssessments);
// Job Roles (per-job, for post-job setup)
router.get('/:id/roles', auth_middleware_1.authenticate, jobController.getJobRoles);
router.post('/:id/roles', auth_middleware_1.authenticate, jobController.createJobRole);
// Hiring Team
router.post('/:id/hiring-team/invite', auth_middleware_1.authenticate, jobController.inviteHiringTeamMember); // Legacy?
router.get('/:id/team', auth_middleware_1.authenticate, jobController.getHiringTeam);
router.post('/:id/team', auth_middleware_1.authenticate, jobController.inviteHiringTeamMember);
router.patch('/:id/team/:memberId', auth_middleware_1.authenticate, jobController.updateHiringTeamMemberRole);
router.delete('/:id/team/:memberId', auth_middleware_1.authenticate, jobController.removeHiringTeamMember);
router.post('/:id/team/:memberId/resend-invite', auth_middleware_1.authenticate, jobController.resendHiringTeamInvite);
exports.default = router;
