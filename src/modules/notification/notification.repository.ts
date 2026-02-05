import { BaseRepository } from '../../core/repository';
import type { Prisma, UniversalNotification, NotificationRecipientType } from '@prisma/client';

export class NotificationRepository extends BaseRepository {
  async create(data: Prisma.UniversalNotificationCreateInput): Promise<UniversalNotification> {
    return this.prisma.universalNotification.create({ data });
  }

  async findByRecipient(
    recipientType: NotificationRecipientType,
    recipientId: string,
    limit: number,
    offset: number
  ) {
    const [notifications, total] = await Promise.all([
      this.prisma.universalNotification.findMany({
        where: { recipient_type: recipientType, recipient_id: recipientId },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      }),
      this.prisma.universalNotification.count({
        where: { recipient_type: recipientType, recipient_id: recipientId }
      })
    ]);

    return { notifications, total };
  }

  async findById(id: string): Promise<UniversalNotification | null> {
    return this.prisma.universalNotification.findUnique({ where: { id } });
  }

  async markAsRead(id: string, recipientType: NotificationRecipientType, recipientId: string) {
    return this.prisma.universalNotification.update({
      where: { id },
      data: { read: true, read_at: new Date() }
    });
  }

  async markAllAsRead(recipientType: NotificationRecipientType, recipientId: string) {
    const result = await this.prisma.universalNotification.updateMany({
      where: { recipient_type: recipientType, recipient_id: recipientId, read: false },
      data: { read: true, read_at: new Date() }
    });
    return result.count;
  }

  async delete(id: string) {
    await this.prisma.universalNotification.delete({ where: { id } });
  }

  async countUnread(recipientType: NotificationRecipientType, recipientId: string) {
    return this.prisma.universalNotification.count({
      where: { recipient_type: recipientType, recipient_id: recipientId, read: false }
    });
  }

  async findRecipientEmail(recipientType: NotificationRecipientType, recipientId: string): Promise<string | null> {
    if (recipientType === 'CANDIDATE') {
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: recipientId },
        select: { email: true }
      });
      return candidate?.email || null;
    }

    if (recipientType === 'USER') {
      const user = await this.prisma.user.findUnique({
        where: { id: recipientId },
        select: { email: true }
      });
      return user?.email || null;
    }

    if (recipientType === 'CONSULTANT') {
      const consultant = await this.prisma.consultant.findUnique({
        where: { id: recipientId },
        select: { email: true }
      });
      return consultant?.email || null;
    }

    if (recipientType === 'HRM8_USER') {
      const hrm8User = await this.prisma.hrm8User.findUnique({
        where: { id: recipientId },
        select: { email: true }
      });
      return hrm8User?.email || null;
    }

    return null;
  }
}
