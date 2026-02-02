import { Prisma, UniversalNotification, NotificationRecipientType } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class NotificationRepository extends BaseRepository {

  async create(data: Prisma.UniversalNotificationCreateInput): Promise<UniversalNotification> {
    return this.prisma.universalNotification.create({ data });
  }

  async findById(id: string): Promise<UniversalNotification | null> {
    return this.prisma.universalNotification.findUnique({
      where: { id },
    });
  }

  async findByRecipient(
    recipientType: NotificationRecipientType,
    recipientId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ notifications: UniversalNotification[], total: number }> {
    const where: Prisma.UniversalNotificationWhereInput = {
      recipient_type: recipientType,
      recipient_id: recipientId,
      expires_at: { gte: new Date() }
    };

    console.log(`[NotificationRepository] Querying notifications for ${recipientType}:${recipientId}, limit=${limit}, offset=${offset}`);

    const [notifications, total] = await Promise.all([
      this.prisma.universalNotification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.universalNotification.count({ where })
    ]);

    console.log(`[NotificationRepository] Found ${notifications.length} notifications, total=${total}`);

    // Also log if no notifications found to help debug
    if (notifications.length === 0) {
      const allCount = await this.prisma.universalNotification.count();
      console.log(`[NotificationRepository] No matching notifications. Total in DB: ${allCount}`);

      // List all notification recipients to help debug
      const recipients = await this.prisma.universalNotification.findMany({
        distinct: ['recipient_type', 'recipient_id'],
        select: { recipient_type: true, recipient_id: true }
      });
      console.log(`[NotificationRepository] Available recipients:`, recipients);
    }

    return { notifications, total };
  }

  async markAsRead(id: string, recipientType: NotificationRecipientType, recipientId: string): Promise<UniversalNotification> {
    // Verify ownership implicitly via where clause if possible, but updateMany returns count.
    // For single update with verification, use findFirst then update, or updateMany.
    // Let's use updateMany to be safe about ownership but fetch result is harder.
    // Or just findUnique and check ownership in service.

    return this.prisma.universalNotification.update({
      where: { id },
      data: {
        read: true,
        read_at: new Date()
      }
    });
  }

  async markAllAsRead(recipientType: NotificationRecipientType, recipientId: string): Promise<number> {
    const result = await this.prisma.universalNotification.updateMany({
      where: {
        recipient_type: recipientType,
        recipient_id: recipientId,
        read: false
      },
      data: {
        read: true,
        read_at: new Date()
      }
    });
    return result.count;
  }

  async findRecipientEmail(recipientType: NotificationRecipientType, recipientId: string): Promise<string | null> {
    if (recipientType === NotificationRecipientType.USER || recipientType === NotificationRecipientType.HRM8_USER) {
      const user = await this.prisma.user.findUnique({
        where: { id: recipientId },
        select: { email: true }
      });
      return user?.email || null;
    }

    if (recipientType === NotificationRecipientType.CANDIDATE) {
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: recipientId },
        select: { email: true }
      });
      return candidate?.email || null;
    }

    if (recipientType === NotificationRecipientType.CONSULTANT) {
      const consultant = await this.prisma.consultant.findUnique({
        where: { id: recipientId },
        select: { email: true }
      });
      return consultant?.email || null;
    }

    return null;
  }
}
