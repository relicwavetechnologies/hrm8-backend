"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const controller_1 = require("../../core/controller");
const settings_service_1 = require("./settings.service");
const settings_repository_1 = require("./settings.repository");
class SettingsController extends controller_1.BaseController {
    constructor() {
        super();
        this.getSettings = async (req, res) => {
            try {
                const { group } = req.query;
                const result = await this.settingsService.getSettings(group);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateSetting = async (req, res) => {
            try {
                const { key, value } = req.body;
                // Use key from params if available, otherwise from body
                const settingKey = req.params.key || key;
                const result = await this.settingsService.updateSetting(settingKey, value, req.hrm8User?.id || 'system');
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.settingsService = new settings_service_1.SettingsService(new settings_repository_1.SettingsRepository());
    }
}
exports.SettingsController = SettingsController;
