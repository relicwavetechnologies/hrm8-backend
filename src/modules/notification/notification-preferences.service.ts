import { BaseService } from '../../core/service';
import { NotificationPreferencesRepository } from './notification-preferences.repository';
import { NotificationRecipientType, UniversalNotificationType } from '@prisma/client';

export class NotificationPreferencesService extends BaseService {
    constructor(private repo: NotificationPreferencesRepository) {
        super();
    }

    /**
     * Determine if a notification should be sent to a specific channel.
     * Default is TRUE (Opt-out model) if no preference found.
     */
    async shouldSend(
        recipientId: string,
        recipientType: NotificationRecipientType,
        eventType: UniversalNotificationType,
        channel: 'EMAIL' | 'IN_APP'
    ): Promise<boolean> {
        // 1. Non-User types (Candidates/Consultants) don't have preferences yet -> Default to TRUE
        if (recipientType !== NotificationRecipientType.USER) {
            return true;
        }

        // 2. Fetch User Preferences
        const prefs = await this.repo.findByUserId(recipientId);
        if (!prefs) {
            return true; // No preferences set -> Default to TRUE
        }

        // 3. Check Event Preference
        const eventPrefs = (prefs.event_preferences as Record<string, any>)?.[eventType];
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
