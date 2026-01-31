import { BaseService } from '../../core/service';
import { SettingsRepository } from './settings.repository';

export class SettingsService extends BaseService {
    constructor(private settingsRepository: SettingsRepository) {
        super();
    }

    async getSettings(group?: string) {
        return this.settingsRepository.getSettings(group);
    }

    async updateSetting(key: string, value: any, updatedBy?: string) {
        return this.settingsRepository.updateSetting(key, value, updatedBy);
    }
}
