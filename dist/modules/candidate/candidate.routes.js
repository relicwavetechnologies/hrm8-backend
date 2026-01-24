"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const candidate_controller_1 = require("./candidate.controller");
const candidate_auth_middleware_1 = require("../../middlewares/candidate-auth.middleware");
const router = (0, express_1.Router)();
const candidateController = new candidate_controller_1.CandidateController();
// Auth Routes
router.post('/auth/register', candidateController.register);
router.post('/auth/login', candidateController.login);
router.get('/auth/verify-email', candidateController.verifyEmail);
router.post('/auth/logout', candidateController.logout);
// Profile Routes
router.get('/profile', candidate_auth_middleware_1.authenticateCandidate, candidateController.getProfile);
router.put('/profile', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateProfile);
router.put('/profile/password', candidate_auth_middleware_1.authenticateCandidate, candidateController.updatePassword);
router.delete('/profile', candidate_auth_middleware_1.authenticateCandidate, candidateController.deleteAccount);
router.get('/profile/export', candidate_auth_middleware_1.authenticateCandidate, candidateController.exportData);
// Work Experience Routes
router.get('/work-history', candidate_auth_middleware_1.authenticateCandidate, candidateController.getWorkHistory);
router.post('/work-history', candidate_auth_middleware_1.authenticateCandidate, candidateController.addWorkExperience);
router.put('/work-history/:id', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateWorkExperience);
router.delete('/work-history/:id', candidate_auth_middleware_1.authenticateCandidate, candidateController.deleteWorkExperience);
// Skills Routes
router.get('/skills', candidate_auth_middleware_1.authenticateCandidate, candidateController.getSkills);
router.put('/skills', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateSkills);
exports.default = router;
