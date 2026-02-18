"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPreferencesService = void 0;
const service_1 = require("../../core/service");
const client_1 = require("@prisma/client");
class NotificationPreferencesService extends service_1.BaseService {
    constructor(repo) {
        super();
        this.repo = repo;
    }
    /**
     * Determine if a notification should be sent to a specific channel.
     * Default is TRUE (Opt-out model) if no preference found.
     */
    async shouldSend(recipientId, recipientType, eventType, channel) {
        // 1. Non-User types (Candidates/Consultants) don't have preferences yet -> Default to TRUE
        if (recipientType !== client_1.NotificationRecipientType.USER) {
            return true;
        }
        // 2. Fetch User Preferences
        const prefs = await this.repo.findByUserId(recipientId);
        if (!prefs) {
            return true; // No preferences set -> Default to TRUE
        }
        // 3. Check Event Preference
        const eventPrefs = prefs.event_preferences?.[eventType];
        if (!eventPrefs) {
            return true; // No preference for this specific event -> Default to TRUE
        }
        // 4. Check Channel
        const channelKey = channel === 'EMAIL' ? 'email' : 'in-app';
        if (eventPrefs[channelKey] === undefined) {
            return true; // Preference exists but channel n/a -> Default to TRUE
        }
        return eventPrefs[channelKey] === true;
    }
}
exports.NotificationPreferencesService = NotificationPreferencesService;
