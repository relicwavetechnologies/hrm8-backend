"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentQuestionAIController = void 0;
const assessment_question_generation_service_1 = require("./assessment-question-generation.service");
class AssessmentQuestionAIController {
    static async generateQuestions(req, res) {
        try {
            const { jobTitle, jobDescription, questionCount } = req.body;
            if (!jobTitle || typeof jobTitle !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'jobTitle is required',
                });
            }
            const questions = await assessment_question_generation_service_1.AssessmentQuestionGenerationService.generateQuestions({
                jobTitle,
                jobDescription: typeof jobDescription === 'string' ? jobDescription : undefined,
                questionCount: typeof questionCount === 'number' ? questionCount : 5,
            });
            res.json({ success: true, data: { questions } });
        }
        catch (error) {
            console.error('Assessment question generation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate assessment questions',
            });
        }
    }
}
exports.AssessmentQuestionAIController = AssessmentQuestionAIController;
