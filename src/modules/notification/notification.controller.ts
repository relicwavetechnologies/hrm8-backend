import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { AuthenticatedRequest, Hrm8AuthenticatedRequest } from '../../types';
import { NotificationRecipientType } from '@prisma/client';

export class NotificationController extends BaseController {
  private notificationService: NotificationService;

  constructor() {
    super();
    this.notificationService = new NotificationService(new NotificationRepository());
  }

  // Helper to resolve recipient info from request user
  private getRecipientInfo(req: AuthenticatedRequest & Hrm8AuthenticatedRequest): { type: NotificationRecipientType, id: string } {
    // If HRM8 Auth was used:
    if ((req as any).hrm8User) {
      console.log(`[NotificationController.getRecipientInfo] HRM8 user authenticated: ${(req as any).hrm8User.email}`);
      return { type: 'HRM8_USER', id: (req as any).hrm8User.id };
    }

    // If ConsultantAuthMiddleware was used:
    if ((req as any).consultant) {
      return { type: 'CONSULTANT', id: (req as any).consultant.id };
    }

    // If CandidateAuthMiddleware was used:
    if ((req as any).candidate) {
      return { type: 'CANDIDATE', id: (req as any).candidate.id };
    }

    // Default to USER (Employer/Admin)
    if (req.user) {
      return { type: 'USER', id: req.user.id };
    }

    throw new Error('Not authenticated');
  }

  list = async (req: AuthenticatedRequest & Hrm8AuthenticatedRequest, res: Response) => {
    try {
      console.log('[NotificationController.list] Request headers:', req.headers);
      console.log('[NotificationController.list] Request cookies:', req.cookies);
      console.log('[NotificationController.list] Request user objects:', {
        user: (req as any).user,
        consultant: (req as any).consultant,
        candidate: (req as any).candidate,
        hrm8User: (req as any).hrm8User
      });

      const { type, id } = this.getRecipientInfo(req);
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      console.log(`[NotificationController.list] Fetching notifications for ${type}:${id}, limit=${limit}, offset=${offset}`);

      const result = await this.notificationService.getUserNotifications(type, id, limit, offset);

      console.log(`[NotificationController.list] Found ${result.notifications.length} notifications, total=${result.total}`);

      // Calculate unread count
      const unreadCount = result.notifications.filter(n => !n.read).length;

      return this.sendSuccess(res, {
        notifications: result.notifications,
        total: result.total,
        unreadCount
      });
    } catch (error) {
      console.error(`[NotificationController.list] Error:`, error);
      return this.sendError(res, error);
    }
  };

  markRead = async (req: AuthenticatedRequest & Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { type, id: userId } = this.getRecipientInfo(req);
      const { id } = req.params as { id: string };

      const notification = await this.notificationService.markAsRead(id, type, userId);
      return this.sendSuccess(res, { notification });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  markAllRead = async (req: AuthenticatedRequest & Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const count = await this.notificationService.markAllAsRead(type, id);
      return this.sendSuccess(res, { message: 'All notifications marked as read', count });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Test endpoint to create sample notifications
  createTestNotification = async (req: AuthenticatedRequest & Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const { title, message } = req.body;

      console.log(`[NotificationController.createTestNotification] Creating test notification for ${type}:${id}`);

      const notification = await this.notificationService['createNotification']({
        recipientType: type,
        recipientId: id,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: title || 'Test Notification',
        message: message || `Test notification for ${type} user`
      });

      return this.sendSuccess(res, { notification });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
