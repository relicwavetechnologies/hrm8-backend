"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreeningQuestionsAIController = void 0;
const question_generation_service_1 = require("./question-generation.service");
class ScreeningQuestionsAIController {
    static async generate(req, res) {
        try {
            const authReq = req;
            const userId = authReq.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Not authenticated' });
            }
            const { jobTitle, jobDescription, companyContext, department, experienceLevel, existingQuestions, count, } = req.body;
            if (!jobTitle || typeof jobTitle !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'jobTitle is required',
                });
            }
            const questions = await question_generation_service_1.QuestionGenerationService.generateScreeningQuestions({
                jobTitle: jobTitle.trim(),
                jobDescription: typeof jobDescription === 'string' ? jobDescription : undefined,
                companyContext: typeof companyContext === 'string' ? companyContext : undefined,
                department: typeof department === 'string' ? department : undefined,
                experienceLevel: typeof experienceLevel === 'string' ? experienceLevel : undefined,
                existingQuestions: Array.isArray(existingQuestions) ? existingQuestions : undefined,
                count: typeof count === 'number' && count >= 1 && count <= 15 ? count : 6,
            });
            return res.json({ success: true, data: { questions } });
        }
        catch (error) {
            console.error('Screening questions generation error:', error);
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to generate screening questions',
            });
        }
    }
}
exports.ScreeningQuestionsAIController = ScreeningQuestionsAIController;
