import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { AssessmentService } from './assessment.service';
import { AssessmentRepository } from './assessment.repository';
import { AuthenticatedRequest } from '../../types';

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

  getAssessmentResults = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const data = await this.assessmentService.getAssessmentResults(id);
      return this.sendSuccess(res, { assessment: data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getAssessmentForGrading = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const data = await this.assessmentService.getAssessmentForGrading(id);
      return this.sendSuccess(res, { assessment: data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  resendAssessmentInvitation = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      await this.assessmentService.resendAssessmentInvitation(id);
      return this.sendSuccess(res, { message: 'Invitation resent successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  gradeResponse = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { responseId, score, feedback } = req.body;
      const graderId = req.user?.id || 'system';
      const result = await this.assessmentService.gradeResponse(responseId, { score, feedback, graderId });
      return this.sendSuccess(res, { result }, 'Response graded successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  addAssessmentComment = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { comment } = req.body;
      const authorId = req.user?.id || 'system';
      const authorName = req.user?.name || 'Recruiter';
      const result = await this.assessmentService.addAssessmentComment(id, { comment, authorId, authorName });
      return this.sendSuccess(res, { comment: result }, 'Comment added successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  scoreAssessment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { totalScore, passed, feedback } = req.body;
      const result = await this.assessmentService.scoreAssessment(id, { totalScore, passed, feedback });
      return this.sendSuccess(res, { assessment: result }, 'Assessment scored successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
