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
    // Instantiate Preference Service locally to keep DI simple for now
    // In a full NestJS/DI framework this would be injected
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
    skipEmail?: boolean; // Manual override to skip email
    email?: string; // Optional direct email override
  }): Promise<UniversalNotification> {
    const expiresAt = data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // 1. Create DB Record
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

    // 2. Broadcast in real-time
    NotificationBroadcastService.broadcastNotification(notification);

    // 3. Send Email (if applicable)
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
      // Check Preferences
      const shouldSend = await this.preferencesService.shouldSend(
        data.recipientId,
        data.recipientType,
        data.type,
        'EMAIL'
      );

      if (!shouldSend) {
        return; // User opted out of emails for this event
      }

      // Resolve Email Address
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
      // Swallow error so we don't block the main notification flow
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

  async getNotificationById(id: string, recipientType: NotificationRecipientType, recipientId: string) {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) throw new HttpException(404, 'Notification not found');

    if (notification.recipient_type !== recipientType || notification.recipient_id !== recipientId) {
      throw new HttpException(403, 'Unauthorized access to notification');
    }

    return notification;
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
