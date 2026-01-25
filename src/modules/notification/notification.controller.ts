import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { AuthenticatedRequest } from '../../types';
import { NotificationRecipientType } from '@prisma/client';

export class NotificationController extends BaseController {
  private notificationService: NotificationService;

  constructor() {
    super();
    this.notificationService = new NotificationService(new NotificationRepository());
  }

  // Helper to resolve recipient info from request user
  private getRecipientInfo(req: AuthenticatedRequest): { type: NotificationRecipientType, id: string } {
    if (!req.user) throw new Error('Not authenticated');
    
    // Determine type based on req.user properties or auth method
    // Assuming standard User model for now, but could be Candidate/Consultant
    // We need to know which auth middleware was used or inspect user object
    
    // If CandidateAuthMiddleware was used:
    if ((req as any).candidate) {
        return { type: 'CANDIDATE', id: (req as any).candidate.id };
    }
    
    // If ConsultantAuthMiddleware was used:
    if ((req as any).consultant) {
        return { type: 'CONSULTANT', id: (req as any).consultant.id };
    }

    // Default to USER (Employer/Admin)
    return { type: 'USER', id: req.user.id };
  }

  list = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const result = await this.notificationService.getUserNotifications(type, id, limit, offset);

      return this.sendSuccess(res, {
        notifications: result.notifications,
        pagination: {
          total: result.total,
          page,
          limit,
          pages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  markRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, id: userId } = this.getRecipientInfo(req);
      const { id } = req.params as { id: string };
      
      const notification = await this.notificationService.markAsRead(id, type, userId);
      return this.sendSuccess(res, { notification });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  markAllRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const count = await this.notificationService.markAllAsRead(type, id);
      return this.sendSuccess(res, { message: 'All notifications marked as read', count });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
