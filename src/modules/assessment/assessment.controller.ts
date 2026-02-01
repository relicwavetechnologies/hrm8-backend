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

  getGrading = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const data = await this.assessmentService.getGradingDetails(id);
      return this.sendSuccess(res, data);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  saveGrade = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { grades } = req.body;
      // Mock grader ID if auth not fully set up in this context, or use req.user.id
      const graderId = (req as any).user?.id || 'system';
      await this.assessmentService.saveGrade(id, grades, graderId);
      return this.sendSuccess(res, { message: 'Grades saved successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  saveComment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { comment } = req.body;
      const userId = (req as any).user?.id || 'system';
      await this.assessmentService.addComment(id, comment, userId);
      return this.sendSuccess(res, { message: 'Comment added' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  finalizeAssessment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const result = await this.assessmentService.finalizeAssessment(id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  resendInvitation = async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      await this.assessmentService.resendInvitation(id);
      return this.sendSuccess(res, { message: 'Invitation resent' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
