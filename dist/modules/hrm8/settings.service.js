"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const service_1 = require("../../core/service");
class SettingsService extends service_1.BaseService {
    constructor(settingsRepository) {
        super();
        this.settingsRepository = settingsRepository;
    }
    async getSettings(group) {
        return this.settingsRepository.getSettings(group);
    }
    async updateSetting(key, value, updatedBy) {
        return this.settingsRepository.updateSetting(key, value, updatedBy);
    }
}
exports.SettingsService = SettingsService;
