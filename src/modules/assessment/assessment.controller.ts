import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { AssessmentService } from './assessment.service';
import { AssessmentRepository } from './assessment.repository';

export class AssessmentController extends BaseController {
  private assessmentService: AssessmentService;

  constructor() {
    super();
    this.assessmentService = new AssessmentService(new AssessmentRepository());
  }

  getAssessmentByToken = async (req: Request, res: Response) => {
    try {
      const { token } = req.params as { token: string };
      const data = await this.assessmentService.getAssessmentByToken(token);
      return this.sendSuccess(res, { assessment: data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  startAssessment = async (req: Request, res: Response) => {
    try {
      const { token } = req.params as { token: string };
      await this.assessmentService.startAssessment(token);
      return this.sendSuccess(res, { message: 'Assessment started' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  submitAssessment = async (req: Request, res: Response) => {
    try {
      const { token } = req.params as { token: string };
      const { responses } = req.body;
      await this.assessmentService.submitAssessment(token, responses);
      return this.sendSuccess(res, { message: 'Assessment submitted' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getAssessmentConfig = async (req: Request, res: Response) => {
    try {
      const { roundId } = req.params as { roundId: string };
      const config = await this.assessmentService.getAssessmentConfig(roundId);
      return this.sendSuccess(res, { config });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  configureAssessment = async (req: Request, res: Response) => {
    try {
      const { roundId } = req.params as { roundId: string };
      const config = await this.assessmentService.configureAssessment(roundId, req.body);
      return this.sendSuccess(res, { config }, 'Assessment configured successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getRoundAssessments = async (req: Request, res: Response) => {
    try {
      const { roundId } = req.params as { roundId: string };
      const assessments = await this.assessmentService.getRoundAssessments(roundId);
      return this.sendSuccess(res, { assessments });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
