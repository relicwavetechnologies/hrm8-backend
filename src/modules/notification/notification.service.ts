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
}
