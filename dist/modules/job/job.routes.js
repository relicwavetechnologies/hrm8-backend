"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const job_controller_1 = require("./job.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Job CRUD
router.post('/', auth_middleware_1.authenticate, job_controller_1.jobController.createJob);
router.get('/', auth_middleware_1.authenticate, job_controller_1.jobController.getJobs);
router.get('/:id', auth_middleware_1.authenticate, job_controller_1.jobController.getJobById);
router.put('/:id', auth_middleware_1.authenticate, job_controller_1.jobController.updateJob);
router.delete('/:id', auth_middleware_1.authenticate, job_controller_1.jobController.deleteJob);
// Actions
router.post('/:id/publish', auth_middleware_1.authenticate, job_controller_1.jobController.publishJob);
router.post('/:id/submit', auth_middleware_1.authenticate, job_controller_1.jobController.submitAndActivate);
router.post('/:id/save-draft', auth_middleware_1.authenticate, job_controller_1.jobController.saveDraft);
router.put('/:id/alerts', auth_middleware_1.authenticate, job_controller_1.jobController.updateAlerts);
// Bulk
router.post('/bulk-delete', auth_middleware_1.authenticate, job_controller_1.jobController.bulkDeleteJobs);
// Hiring Team
router.post('/:id/hiring-team/invite', auth_middleware_1.authenticate, job_controller_1.jobController.inviteHiringTeamMember);
// Payment
router.post('/:id/create-payment', auth_middleware_1.authenticate, job_controller_1.jobController.createJobPayment);
// AI
router.post('/generate-description', auth_middleware_1.authenticate, job_controller_1.jobController.generateDescription);
exports.default = router;
