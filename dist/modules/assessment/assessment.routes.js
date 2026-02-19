"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assessment_controller_1 = require("./assessment.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const assessmentController = new assessment_controller_1.AssessmentController();
// Manual invite (MUST be before /:token routes)
router.post('/invite', auth_middleware_1.authenticate, assessmentController.inviteCandidate);
// Public routes (Candidate portal)
router.get('/:token', assessmentController.getAssessmentByToken);
router.post('/:token/start', assessmentController.startAssessment);
router.post('/:token/save', assessmentController.saveResponse);
router.post('/:token/submit', assessmentController.submitAssessment);
// Recruiter routes
router.get('/:id/grading', auth_middleware_1.authenticate, assessmentController.getGrading);
router.post('/:id/grade', auth_middleware_1.authenticate, assessmentController.saveGrade);
router.post('/:id/vote', auth_middleware_1.authenticate, assessmentController.saveVote);
router.post('/:id/comment', auth_middleware_1.authenticate, assessmentController.saveComment);
router.post('/:id/finalize', auth_middleware_1.authenticate, assessmentController.finalizeAssessment);
// Resend
router.post('/:id/resend', auth_middleware_1.authenticate, assessmentController.resendInvitation);
exports.default = router;
