import { Request, Response } from 'express';
import { AssessmentQuestionGenerationService } from './assessment-question-generation.service';

export class AssessmentQuestionAIController {
  static async generateQuestions(req: Request, res: Response) {
    try {
      const { jobTitle, jobDescription, questionCount } = req.body;

      if (!jobTitle || typeof jobTitle !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'jobTitle is required',
        });
      }

      const questions = await AssessmentQuestionGenerationService.generateQuestions({
        jobTitle,
        jobDescription: typeof jobDescription === 'string' ? jobDescription : undefined,
        questionCount: typeof questionCount === 'number' ? questionCount : 5,
      });

      res.json({ success: true, data: { questions } });
    } catch (error) {
      console.error('Assessment question generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate assessment questions',
      });
    }
  }
}
