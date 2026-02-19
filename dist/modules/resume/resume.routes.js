"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resume_controller_1 = require("./resume.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const resumeController = new resume_controller_1.ResumeController();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
// GET /api/resumes/:resumeId - Get resume by ID
router.get('/:resumeId', resumeController.getResume);
// GET /api/resumes/:resumeId/annotations - Get annotations for a resume
router.get('/:resumeId/annotations', resumeController.getAnnotations);
// POST /api/resumes/:resumeId/annotations - Create annotation
router.post('/:resumeId/annotations', resumeController.createAnnotation);
// DELETE /api/resumes/:resumeId/annotations/:id - Delete annotation
router.delete('/:resumeId/annotations/:id', resumeController.deleteAnnotation);
exports.default = router;
