"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_template_ai_controller_1 = require("./email-template-ai.controller");
const assessment_question_ai_controller_1 = require("./assessment-question-ai.controller");
const screening_questions_ai_controller_1 = require("./screening-questions-ai.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Email Template AI Routes
router.post('/templates/generate', auth_middleware_1.authenticate, email_template_ai_controller_1.EmailTemplateAIController.generateTemplate);
router.post('/templates/rewrite', auth_middleware_1.authenticate, email_template_ai_controller_1.EmailTemplateAIController.rewriteText);
// Assessment Question AI Routes
router.post('/assessment-questions/generate', auth_middleware_1.authenticate, assessment_question_ai_controller_1.AssessmentQuestionAIController.generateQuestions);
// Screening Questions AI (Smart Job Wizard)
router.post('/screening-questions/generate', auth_middleware_1.authenticate, screening_questions_ai_controller_1.ScreeningQuestionsAIController.generate);
exports.default = router;
