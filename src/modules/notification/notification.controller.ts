import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { AuthenticatedRequest, Hrm8AuthenticatedRequest, ConsultantAuthenticatedRequest, UnifiedAuthenticatedRequest } from '../../types';
import { NotificationRecipientType, UniversalNotificationType } from '@prisma/client';

type NotificationRequest = AuthenticatedRequest & Hrm8AuthenticatedRequest & ConsultantAuthenticatedRequest & UnifiedAuthenticatedRequest;

export class NotificationController extends BaseController {
  private notificationService: NotificationService;

  constructor() {
    super();
    this.notificationService = new NotificationService(new NotificationRepository());
  }

  private getRecipientInfo(req: NotificationRequest): { type: NotificationRecipientType; id: string } {
    if ((req as any).hrm8User) {
      return { type: 'HRM8_USER', id: (req as any).hrm8User.id };
    }

    if ((req as any).consultant) {
      return { type: 'CONSULTANT', id: (req as any).consultant.id };
    }

    if ((req as any).candidate) {
      return { type: 'CANDIDATE', id: (req as any).candidate.id };
    }

    if (req.user) {
      if (req.user.type === 'CANDIDATE') {
        return { type: 'CANDIDATE', id: req.user.id };
      }
      return { type: 'USER', id: req.user.id };
    }

    throw new Error('Not authenticated');
  }

  list = async (req: NotificationRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.notificationService.getUserNotifications(type, id, limit, offset);
      const unreadCount = result.notifications.filter(n => !n.read).length;

      return this.sendSuccess(res, {
        notifications: result.notifications,
        total: result.total,
        unreadCount
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getNotification = async (req: NotificationRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const notification = await this.notificationService.getNotificationById(req.params.id as string, type, id);
      return this.sendSuccess(res, { notification });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getUnreadCount = async (req: NotificationRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const count = await this.notificationService.getUnreadCount(type, id);
      return this.sendSuccess(res, { count });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  markRead = async (req: NotificationRequest, res: Response) => {
    try {
      const { type, id: userId } = this.getRecipientInfo(req);
      const { id } = req.params as { id: string };

      const notification = await this.notificationService.markAsRead(id, type, userId);
      return this.sendSuccess(res, { notification });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  markAllRead = async (req: NotificationRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const count = await this.notificationService.markAllAsRead(type, id);
      return this.sendSuccess(res, { count });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteNotification = async (req: NotificationRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const ok = await this.notificationService.deleteNotification(req.params.id as string, type, id);
      return this.sendSuccess(res, { success: ok });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createTestNotification = async (req: NotificationRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const { title, message, notificationType } = req.body as {
        title?: string;
        message?: string;
        notificationType?: UniversalNotificationType;
      };
      const notification = await this.notificationService.createTestNotification(type, id, {
        title,
        message,
        type: notificationType
      });
      return this.sendSuccess(res, { notification });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
