import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { AssessmentService } from './assessment.service';
import { AssessmentRepository } from './assessment.repository';
import { AuthenticatedRequest } from '../../types';
import { HttpException } from '../../core/http-exception';

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

  saveResponse = async (req: Request, res: Response) => {
    try {
      const { token } = req.params as { token: string };
      const { questionId, response } = req.body;
      if (!questionId) {
        return this.sendError(res, new Error('questionId is required'), 400);
      }
      await this.assessmentService.saveResponse(token, questionId, response);
      return this.sendSuccess(res, { message: 'Response saved' });
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

  inviteCandidate = async (req: Request, res: Response) => {
    try {
      const { applicationId, jobRoundId } = req.body;
      if (!applicationId || !jobRoundId) {
        return this.sendError(res, new Error('applicationId and jobRoundId are required'), 400);
      }
      const userId = (req as any).user?.id;
      if (!userId) {
        return this.sendError(res, new Error('User not authenticated'), 401);
      }
      const result = await this.assessmentService.manualInviteToAssessment(applicationId, jobRoundId, userId);
      if (!result.success) {
        return this.sendError(res, new Error(result.error || 'Failed to invite'), 400);
      }
      return this.sendSuccess(res, { message: 'Invitation sent successfully', assessmentId: result.assessmentId });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCandidateAssessments = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const candidateId = req.user?.id;
      if (!candidateId) throw new HttpException(401, 'Candidate not authenticated');

      const assessments = await this.assessmentService.getCandidateAssessments(candidateId);
      return this.sendSuccess(res, { assessments });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Legacy grading endpoints
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
