"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const controller_1 = require("../../core/controller");
const notification_service_1 = require("./notification.service");
const notification_repository_1 = require("./notification.repository");
class NotificationController extends controller_1.BaseController {
    constructor() {
        super();
        this.list = async (req, res) => {
            try {
                const { type, id } = this.getRecipientInfo(req);
                const limit = parseInt(req.query.limit) || 10;
                const offset = parseInt(req.query.offset) || 0;
                const result = await this.notificationService.getUserNotifications(type, id, limit, offset);
                const unreadCount = await this.notificationService.getUnreadCount(type, id);
                const notifications = result.notifications.map((notification) => this.toNotificationDTO(notification));
                return this.sendSuccess(res, {
                    notifications,
                    total: result.total,
                    unreadCount
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getOne = async (req, res) => {
            try {
                const { type, id: userId } = this.getRecipientInfo(req);
                const { id } = req.params;
                const notification = await this.notificationService.getNotificationById(id, type, userId);
                return this.sendSuccess(res, this.toNotificationDTO(notification));
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.markRead = async (req, res) => {
            try {
                const { type, id: userId } = this.getRecipientInfo(req);
                const { id } = req.params;
                const notification = await this.notificationService.markAsRead(id, type, userId);
                return this.sendSuccess(res, { notification: this.toNotificationDTO(notification) });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.markAllRead = async (req, res) => {
            try {
                const { type, id } = this.getRecipientInfo(req);
                const count = await this.notificationService.markAllAsRead(type, id);
                return this.sendSuccess(res, { message: 'All notifications marked as read', count });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.count = async (req, res) => {
            try {
                const { type, id } = this.getRecipientInfo(req);
                const unreadCount = await this.notificationService.getUnreadCount(type, id);
                return this.sendSuccess(res, { unreadCount });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Test endpoint to create sample notifications
        this.createTestNotification = async (req, res) => {
            try {
                const { type, id } = this.getRecipientInfo(req);
                const { title, message } = req.body;
                const notification = await this.notificationService['createNotification']({
                    recipientType: type,
                    recipientId: id,
                    type: 'SYSTEM_ANNOUNCEMENT',
                    title: title || 'Test Notification',
                    message: message || `Test notification for ${type} user`
                });
                return this.sendSuccess(res, { notification });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.notificationService = new notification_service_1.NotificationService(new notification_repository_1.NotificationRepository());
    }
    // Helper to resolve recipient info from request user
    getRecipientInfo(req) {
        // If HRM8 Auth was used:
        if (req.hrm8User) {
            return { type: 'HRM8_USER', id: req.hrm8User.id };
        }
        // If ConsultantAuthMiddleware was used:
        if (req.consultant) {
            return { type: 'CONSULTANT', id: req.consultant.id };
        }
        // If CandidateAuthMiddleware was used:
        if (req.candidate) {
            return { type: 'CANDIDATE', id: req.candidate.id };
        }
        // Default to USER (Employer/Admin)
        if (req.user) {
            return { type: 'USER', id: req.user.id };
        }
        throw new Error('Not authenticated');
    }
    toNotificationDTO(notification) {
        return {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            actionUrl: notification.action_url,
            read: notification.read,
            readAt: notification.read_at,
            createdAt: notification.created_at,
            jobId: notification.job_id || undefined,
            applicationId: notification.application_id || undefined,
            companyId: notification.company_id || undefined,
            leadId: notification.lead_id || undefined,
            regionId: notification.region_id || undefined,
        };
    }
}
exports.NotificationController = NotificationController;
