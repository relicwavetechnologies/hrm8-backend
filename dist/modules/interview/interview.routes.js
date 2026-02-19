"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const interview_controller_1 = require("./interview.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const unified_auth_middleware_1 = require("../../middlewares/unified-auth.middleware");
const router = (0, express_1.Router)();
const interviewController = new interview_controller_1.InterviewController();
router.post('/', auth_middleware_1.authenticate, interviewController.create);
// Generic list with query params
router.get('/', unified_auth_middleware_1.authenticateUnified, interviewController.list);
router.get('/job/:jobId', unified_auth_middleware_1.authenticateUnified, interviewController.listByJob);
router.get('/application/:applicationId', unified_auth_middleware_1.authenticateUnified, interviewController.listByApplication);
router.get('/:id', unified_auth_middleware_1.authenticateUnified, interviewController.getById);
router.put('/:id', auth_middleware_1.authenticate, interviewController.update);
router.patch('/:id/status', auth_middleware_1.authenticate, interviewController.updateStatus);
router.post('/:id/feedback', auth_middleware_1.authenticate, interviewController.addFeedback);
router.get('/:id/progression-status', unified_auth_middleware_1.authenticateUnified, interviewController.getProgressionStatus);
exports.default = router;
