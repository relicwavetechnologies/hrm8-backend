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

    const [notifications, total] = await Promise.all([
      this.prisma.universalNotification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.universalNotification.count({ where })
    ]);

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
}
