"use strict";
/**
 * Singleton instance of NotificationService
 * Used by all modules to create notifications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationService = getNotificationService;
exports.notifyAdmin = notifyAdmin;
exports.notifySalesAgent = notifySalesAgent;
exports.notifyConsultant = notifyConsultant;
exports.broadcastToConsultants = broadcastToConsultants;
const notification_service_1 = require("./notification.service");
const notification_repository_1 = require("./notification.repository");
let notificationServiceInstance = null;
function getNotificationService() {
    if (!notificationServiceInstance) {
        notificationServiceInstance = new notification_service_1.NotificationService(new notification_repository_1.NotificationRepository());
    }
    return notificationServiceInstance;
}
/**
 * Create a notification for an admin/user
 */
async function notifyAdmin(data) {
    try {
        const service = getNotificationService();
        // TODO: If adminId is provided, notify specific admin
        // Otherwise, this would need admin list from the database
        console.log(`[NotificationService] Would notify admin:`, data);
    }
    catch (error) {
        console.error('[NotificationService] Error notifying admin:', error);
    }
}
/**
 * Create a notification for a sales agent
 */
async function notifySalesAgent(salesAgentId, data) {
    try {
        const service = getNotificationService();
        await service.createNotification({
            recipientType: 'CONSULTANT',
            recipientId: salesAgentId,
            type: data.type || 'SYSTEM_ANNOUNCEMENT',
            title: data.title,
            message: data.message,
            actionUrl: data.actionUrl
        });
        console.log(`[NotificationService] Notified sales agent ${salesAgentId}:`, data.title);
    }
    catch (error) {
        console.error('[NotificationService] Error notifying sales agent:', error);
    }
}
/**
 * Create a notification for a consultant
 */
async function notifyConsultant(consultantId, data) {
    try {
        const service = getNotificationService();
        await service.createNotification({
            recipientType: 'CONSULTANT',
            recipientId: consultantId,
            type: data.type || 'SYSTEM_ANNOUNCEMENT',
            title: data.title,
            message: data.message,
            actionUrl: data.actionUrl
        });
        console.log(`[NotificationService] Notified consultant ${consultantId}:`, data.title);
    }
    catch (error) {
        console.error('[NotificationService] Error notifying consultant:', error);
    }
}
/**
 * Create a notification for all consultants (broadcast)
 */
async function broadcastToConsultants(data) {
    try {
        console.log(`[NotificationService] Would broadcast to all consultants:`, data.title);
        // TODO: Get all consultant IDs and create notifications for each
    }
    catch (error) {
        console.error('[NotificationService] Error broadcasting:', error);
    }
}
