"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const hrm8_auth_middleware_1 = require("../../middlewares/hrm8-auth.middleware");
const consultant_auth_middleware_1 = require("../../middlewares/consultant-auth.middleware");
const assistant_controller_1 = require("./assistant.controller");
const router = (0, express_1.Router)();
const controller = new assistant_controller_1.AssistantController();
// Company-side assistant (ATS/admin company users)
router.post('/chat', auth_middleware_1.authenticate, controller.companyChat);
router.post('/chat/stream', auth_middleware_1.authenticate, controller.companyChatStream);
// Consultant-side assistant
router.post('/chat/consultant/stream', consultant_auth_middleware_1.authenticateConsultant, controller.consultantChatStream);
// HRM8 admin-side assistant
router.post('/chat/hrm8', hrm8_auth_middleware_1.authenticateHrm8, controller.hrm8Chat);
router.post('/chat/hrm8/stream', hrm8_auth_middleware_1.authenticateHrm8, controller.hrm8ChatStream);
exports.default = router;
