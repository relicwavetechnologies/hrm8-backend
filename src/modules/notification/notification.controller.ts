import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { UnifiedAuthenticatedRequest } from '../../types';
import { NotificationRecipientType } from '@prisma/client';

export class NotificationController extends BaseController {
  private notificationService: NotificationService;

  constructor() {
    super();
    this.notificationService = new NotificationService(new NotificationRepository());
  }

  // Helper to resolve recipient info from request user
  // Helper to resolve recipient info from request user
  private getRecipientInfo(req: UnifiedAuthenticatedRequest): { type: NotificationRecipientType, id: string } {
    if (!req.user && !req.candidate) throw new Error('Not authenticated');

    // Check for candidate first (from session)
    if (req.candidate) {
      return { type: 'CANDIDATE', id: req.candidate.id };
    }

    // Check for user/staff
    if (req.user) {
      // If it's a candidate populated in req.user (compatibility mode)
      if (req.user.type === 'CANDIDATE') {
        return { type: 'CANDIDATE', id: req.user.id };
      }
      return { type: 'USER', id: req.user.id };
    }

    throw new Error('Could not resolve recipient');
  }

  list = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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

  markRead = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { type, id: userId } = this.getRecipientInfo(req);
      const { id } = req.params as { id: string };

      const notification = await this.notificationService.markAsRead(id, type, userId);
      return this.sendSuccess(res, { notification });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  markAllRead = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const count = await this.notificationService.markAllAsRead(type, id);
      return this.sendSuccess(res, { message: 'All notifications marked as read', count });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
