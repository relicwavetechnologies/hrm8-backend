import { BaseRepository } from '../../core/repository';
import { UserNotificationPreferences } from '@prisma/client';

export class NotificationPreferencesRepository extends BaseRepository {
    async findByUserId(userId: string): Promise<UserNotificationPreferences | null> {
        return this.prisma.userNotificationPreferences.findUnique({
            where: { user_id: userId },
        });
    }
}
