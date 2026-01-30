import { BaseService } from '../../core/service';
import { NotificationRepository } from './notification.repository';
import { NotificationBroadcastService } from './notification-broadcast.service';
import { UniversalNotification, NotificationRecipientType, UniversalNotificationType } from '@prisma/client';
import { HttpException } from '../../core/http-exception';

export class NotificationService extends BaseService {
  constructor(private notificationRepository: NotificationRepository) {
    super();
  }

  async createNotification(data: {
    recipientType: NotificationRecipientType;
    recipientId: string;
    type: UniversalNotificationType;
    title: string;
    message: string;
    data?: any;
    actionUrl?: string;
    expiresAt?: Date;
    skipEmail?: boolean;
  }): Promise<UniversalNotification> {
    const expiresAt = data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const notification = await this.notificationRepository.create({
      recipient_type: data.recipientType,
      recipient_id: data.recipientId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || {},
      action_url: data.actionUrl,
      expires_at: expiresAt
    });

    // Broadcast in real-time
    NotificationBroadcastService.broadcastNotification(notification);

    // 2. Email Integration
    if (!data.skipEmail) {
      try {
        const { emailService } = await import('../email/email.service');

        // Simple logic: if CANDIDATE or USER, try to find their email and send
        // In production, this should check UserNotificationPreferences
        if (data.recipientType === 'CANDIDATE') {
          const candidate = await this.prisma.candidate.findUnique({
            where: { id: data.recipientId },
            select: { email: true }
          });
          if (candidate?.email) {
            await emailService.sendNotificationEmail(candidate.email, data.title, data.message, data.actionUrl);
          }
        } else if (data.recipientType === 'USER') {
          const user = await this.prisma.user.findUnique({
            where: { id: data.recipientId },
            select: { email: true }
          });
          if (user?.email) {
            await emailService.sendNotificationEmail(user.email, data.title, data.message, data.actionUrl);
          }
        }
      } catch (error) {
        console.error('[NotificationService] Failed to send notification email:', error);
      }
    }

    return notification;
  }

  async getUserNotifications(
    recipientType: NotificationRecipientType,
    recipientId: string,
    limit: number = 20,
    offset: number = 0
  ) {
    return this.notificationRepository.findByRecipient(recipientType, recipientId, limit, offset);
  }

  async markAsRead(id: string, recipientType: NotificationRecipientType, recipientId: string) {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) throw new HttpException(404, 'Notification not found');

    if (notification.recipient_type !== recipientType || notification.recipient_id !== recipientId) {
      throw new HttpException(403, 'Unauthorized access to notification');
    }

    return this.notificationRepository.markAsRead(id, recipientType, recipientId);
  }

  async markAllAsRead(recipientType: NotificationRecipientType, recipientId: string) {
    return this.notificationRepository.markAllAsRead(recipientType, recipientId);
  }

  async getNotificationById(id: string, recipientType: NotificationRecipientType, recipientId: string) {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new HttpException(404, 'Notification not found');
    }

    if (notification.recipient_type !== recipientType || notification.recipient_id !== recipientId) {
      throw new HttpException(403, 'Unauthorized access to notification');
    }

    return notification;
  }

  async getUnreadCount(recipientType: NotificationRecipientType, recipientId: string): Promise<number> {
    return this.notificationRepository.countUnread(recipientType, recipientId);
  }

  async deleteNotification(id: string, recipientType: NotificationRecipientType, recipientId: string): Promise<boolean> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      return false;
    }

    if (notification.recipient_type !== recipientType || notification.recipient_id !== recipientId) {
      throw new HttpException(403, 'Unauthorized access to notification');
    }

    await this.notificationRepository.delete(id);
    return true;
  }

  async createTestNotification(
    recipientType: NotificationRecipientType,
    recipientId: string,
    data: {
      title?: string;
      message?: string;
      type?: UniversalNotificationType;
    }
  ): Promise<UniversalNotification> {
    return this.createNotification({
      recipientType,
      recipientId,
      type: data.type || UniversalNotificationType.SYSTEM_ANNOUNCEMENT,
      title: data.title || 'Test Notification',
      message: data.message || `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
      data: {
        source: 'manual_test',
        timestamp: Date.now(),
      },
    });
  }

  async getRecipientsByFilters(filters: {
    role?: NotificationRecipientType;
    regionId?: string;
    companyId?: string;
  }): Promise<Array<{ type: NotificationRecipientType; id: string }>> {
    const recipients: Array<{ type: NotificationRecipientType; id: string }> = [];

    // Get users based on filters
    if (filters.role === 'USER' || !filters.role) {
      const users = await this.prisma.user.findMany({
        where: {
          ...(filters.companyId ? { company_id: filters.companyId } : {}),
        },
        select: { id: true },
      });
      recipients.push(...users.map((u: any) => ({ type: NotificationRecipientType.USER, id: u.id })));
    }

    if (filters.role === 'CANDIDATE' || !filters.role) {
      const candidates = await this.prisma.candidate.findMany({
        select: { id: true },
      });
      recipients.push(...candidates.map((c: any) => ({ type: NotificationRecipientType.CANDIDATE, id: c.id })));
    }

    if (filters.role === 'CONSULTANT' || !filters.role) {
      const consultants = await this.prisma.consultant.findMany({
        select: { id: true },
      });
      recipients.push(...consultants.map((c: any) => ({ type: NotificationRecipientType.CONSULTANT, id: c.id })));
    }

    return recipients;
  }

  async createBulkNotifications(data: {
    recipients: Array<{ type: NotificationRecipientType; id: string }>;
    type: UniversalNotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    regionId?: string;
    companyId?: string;
    skipEmail?: boolean;
  }): Promise<UniversalNotification[]> {
    const notifications = await Promise.all(
      data.recipients.map(recipient =>
        this.createNotification({
          recipientType: recipient.type,
          recipientId: recipient.id,
          type: data.type,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          skipEmail: data.skipEmail,
          data: {
            regionId: data.regionId,
            companyId: data.companyId,
          },
        })
      )
    );

    return notifications;
  }
}
