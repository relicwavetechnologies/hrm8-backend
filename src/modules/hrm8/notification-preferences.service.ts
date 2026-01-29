import { BaseService } from '../../core/service';
import { NotificationPreferencesRepository } from './notification-preferences.repository';

export class NotificationPreferencesService extends BaseService {
    constructor(private repo: NotificationPreferencesRepository) {
        super();
    }

    async getPreferences(userId: string) {
        return this.repo.getPreferences(userId);
    }

    async updatePreferences(userId: string, preferences: any) {
        return this.repo.upsertPreferences(userId, preferences);
    }

    async getAlertRules(userId: string) {
        return this.repo.getAlertRules(userId);
    }

    async createAlertRule(userId: string, data: any) {
        return this.repo.createAlertRule(userId, data);
    }

    async updateAlertRule(id: string, userId: string, data: any) {
        return this.repo.updateAlertRule(id, userId, data);
    }

    async deleteAlertRule(id: string, userId: string) {
        return this.repo.deleteAlertRule(id, userId);
    }
}
