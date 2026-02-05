import { BaseService } from '../../core/service';
import { NotificationRepository } from './notification.repository';
import { NotificationBroadcastService } from './notification-broadcast.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesRepository } from './notification-preferences.repository';
import { emailService } from '../email/email.service';
import { UniversalNotification, NotificationRecipientType, UniversalNotificationType } from '@prisma/client';
import { HttpException } from '../../core/http-exception';

export class NotificationService extends BaseService {
  private preferencesService: NotificationPreferencesService;

  constructor(private notificationRepository: NotificationRepository) {
    super();
    const prefRepo = new NotificationPreferencesRepository();
    this.preferencesService = new NotificationPreferencesService(prefRepo);
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
    email?: string;
  }): Promise<UniversalNotification> {
    const expiresAt = data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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

    NotificationBroadcastService.broadcastNotification(notification);

    if (!data.skipEmail) {
      await this.handleEmailNotification(data);
    }

    return notification;
  }

  private async handleEmailNotification(data: {
    recipientType: NotificationRecipientType;
    recipientId: string;
    type: UniversalNotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    email?: string;
  }) {
    try {
      const shouldSend = await this.preferencesService.shouldSend(
        data.recipientId,
        data.recipientType,
        data.type,
        'EMAIL'
      );

      if (!shouldSend) {
        return;
      }

      let email = data.email;
      if (!email) {
        const resolvedEmail = await this.notificationRepository.findRecipientEmail(data.recipientType, data.recipientId);
        if (resolvedEmail) {
          email = resolvedEmail;
        }
      }

      if (email) {
        await emailService.sendNotificationEmail(
          email,
          data.title,
          data.message,
          data.actionUrl
        );
      } else {
        console.warn(`[NotificationService] Could not resolve email for ${data.recipientType}:${data.recipientId}`);
      }
    } catch (error) {
      console.error('[NotificationService] Error sending email notification:', error);
    }
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
}
