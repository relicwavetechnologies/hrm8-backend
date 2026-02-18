"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const service_1 = require("../../core/service");
const notification_broadcast_service_1 = require("./notification-broadcast.service");
const notification_preferences_service_1 = require("./notification-preferences.service");
const notification_preferences_repository_1 = require("./notification-preferences.repository");
const email_service_1 = require("../email/email.service");
const http_exception_1 = require("../../core/http-exception");
class NotificationService extends service_1.BaseService {
    constructor(notificationRepository) {
        super();
        this.notificationRepository = notificationRepository;
        // Instantiate Preference Service locally to keep DI simple for now
        // In a full NestJS/DI framework this would be injected
        const prefRepo = new notification_preferences_repository_1.NotificationPreferencesRepository();
        this.preferencesService = new notification_preferences_service_1.NotificationPreferencesService(prefRepo);
    }
    async createNotification(data) {
        const expiresAt = data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
        // 1. Create DB Record
        const notification = await this.notificationRepository.create({
            recipient_type: data.recipientType,
            recipient_id: data.recipientId,
            type: data.type,
            title: data.title,
            message: data.message,
            data: data.data || {},
            action_url: data.actionUrl,
            expires_at: expiresAt
        });
        // 2. Broadcast in real-time
        notification_broadcast_service_1.NotificationBroadcastService.broadcastNotification(notification);
        // 3. Send Email (if applicable)
        if (!data.skipEmail) {
            await this.handleEmailNotification(data);
        }
        return notification;
    }
    async handleEmailNotification(data) {
        try {
            // Check Preferences
            const shouldSend = await this.preferencesService.shouldSend(data.recipientId, data.recipientType, data.type, 'EMAIL');
            if (!shouldSend) {
                return; // User opted out of emails for this event
            }
            // Resolve Email Address
            let email = data.email;
            if (!email) {
                const resolvedEmail = await this.notificationRepository.findRecipientEmail(data.recipientType, data.recipientId);
                if (resolvedEmail) {
                    email = resolvedEmail;
                }
            }
            if (email) {
                await email_service_1.emailService.sendNotificationEmail(email, data.title, data.message, data.actionUrl);
            }
            else {
                console.warn(`[NotificationService] Could not resolve email for ${data.recipientType}:${data.recipientId}`);
            }
        }
        catch (error) {
            console.error('[NotificationService] Error sending email notification:', error);
            // Swallow error so we don't block the main notification flow
        }
    }
    async getUserNotifications(recipientType, recipientId, limit = 20, offset = 0) {
        return this.notificationRepository.findByRecipient(recipientType, recipientId, limit, offset);
    }
    async getNotificationById(id, recipientType, recipientId) {
        const notification = await this.notificationRepository.findById(id);
        if (!notification)
            throw new http_exception_1.HttpException(404, 'Notification not found');
        if (notification.recipient_type !== recipientType || notification.recipient_id !== recipientId) {
            throw new http_exception_1.HttpException(403, 'Unauthorized access to notification');
        }
        return notification;
    }
    async markAsRead(id, recipientType, recipientId) {
        const notification = await this.notificationRepository.findById(id);
        if (!notification)
            throw new http_exception_1.HttpException(404, 'Notification not found');
        if (notification.recipient_type !== recipientType || notification.recipient_id !== recipientId) {
            throw new http_exception_1.HttpException(403, 'Unauthorized access to notification');
        }
        return this.notificationRepository.markAsRead(id, recipientType, recipientId);
    }
    async markAllAsRead(recipientType, recipientId) {
        return this.notificationRepository.markAllAsRead(recipientType, recipientId);
    }
}
exports.NotificationService = NotificationService;
