"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPreferencesRepository = void 0;
const repository_1 = require("../../core/repository");
class NotificationPreferencesRepository extends repository_1.BaseRepository {
    async findByUserId(userId) {
        return this.prisma.userNotificationPreferences.findUnique({
            where: { user_id: userId },
        });
    }
}
exports.NotificationPreferencesRepository = NotificationPreferencesRepository;
