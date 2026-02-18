"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationBroadcastService = void 0;
let broadcastFn = null;
let connectionsMap = null;
class NotificationBroadcastService {
    static init(broadcast, connections) {
        broadcastFn = broadcast;
        connectionsMap = connections;
    }
    static buildConnectionKey(recipientType, recipientId) {
        const userTypeMap = {
            USER: 'USER',
            CANDIDATE: 'CANDIDATE',
            CONSULTANT: 'CONSULTANT',
            HRM8_USER: 'HRM8',
        };
        return `${userTypeMap[recipientType]}:${recipientId}`;
    }
    static broadcastNotification(notification) {
        if (!broadcastFn || !connectionsMap) {
            // Silent fail if WS not initialized (e.g. during tests or scripts)
            return false;
        }
        const connectionKey = this.buildConnectionKey(notification.recipient_type, notification.recipient_id);
        // Check if user is connected
        if (!connectionsMap.has(connectionKey)) {
            return false;
        }
        const message = {
            type: 'notification',
            payload: {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                actionUrl: notification.action_url,
                createdAt: notification.created_at,
                read: notification.read,
            },
        };
        broadcastFn(message, {
            type: 'users',
            targetConnectionKeys: [connectionKey],
        });
        return true;
    }
}
exports.NotificationBroadcastService = NotificationBroadcastService;
