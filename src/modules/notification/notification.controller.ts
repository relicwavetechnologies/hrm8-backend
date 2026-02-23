import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { AuthenticatedRequest, Hrm8AuthenticatedRequest } from '../../types';
import { NotificationRecipientType, UniversalNotification } from '@prisma/client';

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

  private toNotificationDTO(notification: UniversalNotification) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      actionUrl: notification.action_url,
      read: notification.read,
      readAt: notification.read_at,
      createdAt: notification.created_at,
      jobId: notification.job_id || undefined,
      applicationId: notification.application_id || undefined,
      companyId: notification.company_id || undefined,
      leadId: notification.lead_id || undefined,
      regionId: notification.region_id || undefined,
    };
  }

  list = async (req: AuthenticatedRequest & Hrm8AuthenticatedRequest, res: Response) => {
    try {

      const { type, id } = this.getRecipientInfo(req);
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;


      const result = await this.notificationService.getUserNotifications(type, id, limit, offset);
      const unreadCount = await this.notificationService.getUnreadCount(type, id);
      const notifications = result.notifications.map((notification) => this.toNotificationDTO(notification));

      return this.sendSuccess(res, {
        notifications,
        total: result.total,
        unreadCount
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getOne = async (req: AuthenticatedRequest & Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { type, id: userId } = this.getRecipientInfo(req);
      const { id } = req.params as { id: string };

      const notification = await this.notificationService.getNotificationById(id, type, userId);
      return this.sendSuccess(res, this.toNotificationDTO(notification));
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  markRead = async (req: AuthenticatedRequest & Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { type, id: userId } = this.getRecipientInfo(req);
      const { id } = req.params as { id: string };

      const notification = await this.notificationService.markAsRead(id, type, userId);
      return this.sendSuccess(res, { notification: this.toNotificationDTO(notification) });
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

  count = async (req: AuthenticatedRequest & Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const unreadCount = await this.notificationService.getUnreadCount(type, id);
      return this.sendSuccess(res, { unreadCount });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Test endpoint to create sample notifications
  createTestNotification = async (req: AuthenticatedRequest & Hrm8AuthenticatedRequest, res: Response) => {
    try {
      const { type, id } = this.getRecipientInfo(req);
      const { title, message } = req.body;


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
