import { BaseRepository } from '../../core/repository';

export class NotificationPreferencesRepository extends BaseRepository {
    async getPreferences(userId: string) {
        return this.prisma.userNotificationPreferences.findUnique({
            where: { user_id: userId }
        });
    }

    async upsertPreferences(userId: string, preferences: any) {
        return this.prisma.userNotificationPreferences.upsert({
            where: { user_id: userId },
            create: {
                user_id: userId,
                event_preferences: preferences.eventPreferences || {},
                quiet_hours: preferences.quietHours
            },
            update: {
                event_preferences: preferences.eventPreferences,
                quiet_hours: preferences.quietHours
            }
        });
    }

    async getAlertRules(userId: string) {
        return this.prisma.userAlertRule.findMany({
            where: { user_id: userId }
        });
    }

    async createAlertRule(userId: string, data: any) {
        return this.prisma.userAlertRule.create({
            data: {
                user_id: userId,
                name: data.name,
                description: data.description,
                enabled: data.enabled ?? true,
                event_type: data.eventType,
                conditions: data.conditions,
                actions: data.actions,
                created_by: userId
            }
        });
    }

    async updateAlertRule(id: string, userId: string, data: any) {
        return this.prisma.userAlertRule.update({
            where: { id, user_id: userId }, // Ensure ownership
            data
        });
    }

    async deleteAlertRule(id: string, userId: string) {
        return this.prisma.userAlertRule.delete({
            where: { id, user_id: userId }
        });
    }
}
