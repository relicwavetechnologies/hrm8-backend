/**
 * Singleton instance of NotificationService
 * Used by all modules to create notifications
 */

import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';

let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService(new NotificationRepository());
  }
  return notificationServiceInstance;
}

/**
 * Create a notification for an admin/user
 */
export async function notifyAdmin(data: {
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
  adminId?: string; // If specific admin, otherwise all admins
}) {
  try {
    const service = getNotificationService();
    // TODO: If adminId is provided, notify specific admin
    // Otherwise, this would need admin list from the database
    console.log(`[NotificationService] Would notify admin:`, data);
  } catch (error) {
    console.error('[NotificationService] Error notifying admin:', error);
  }
}

/**
 * Create a notification for a sales agent
 */
export async function notifySalesAgent(salesAgentId: string, data: {
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
}) {
  try {
    const service = getNotificationService();
    await service.createNotification({
      recipientType: 'CONSULTANT',
      recipientId: salesAgentId,
      type: (data.type as any) || 'SYSTEM_ANNOUNCEMENT',
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl
    });
    console.log(`[NotificationService] Notified sales agent ${salesAgentId}:`, data.title);
  } catch (error) {
    console.error('[NotificationService] Error notifying sales agent:', error);
  }
}

/**
 * Create a notification for a consultant
 */
export async function notifyConsultant(consultantId: string, data: {
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
}) {
  try {
    const service = getNotificationService();
    await service.createNotification({
      recipientType: 'CONSULTANT',
      recipientId: consultantId,
      type: (data.type as any) || 'SYSTEM_ANNOUNCEMENT',
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl
    });
    console.log(`[NotificationService] Notified consultant ${consultantId}:`, data.title);
  } catch (error) {
    console.error('[NotificationService] Error notifying consultant:', error);
  }
}

/**
 * Create a notification for all consultants (broadcast)
 */
export async function broadcastToConsultants(data: {
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
}) {
  try {
    console.log(`[NotificationService] Would broadcast to all consultants:`, data.title);
    // TODO: Get all consultant IDs and create notifications for each
  } catch (error) {
    console.error('[NotificationService] Error broadcasting:', error);
  }
}
