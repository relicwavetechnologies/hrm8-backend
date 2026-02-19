"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const service_1 = require("../../core/service");
const password_1 = require("../../utils/password");
const email_1 = require("../../utils/email");
const http_exception_1 = require("../../core/http-exception");
class UserService extends service_1.BaseService {
    constructor(userRepository) {
        super();
        this.userRepository = userRepository;
    }
    async createUser(companyId, creatorId, data) {
        const email = (0, email_1.normalizeEmail)(data.email);
        // Check if email already exists
        const exists = await this.userRepository.countByEmail(email);
        if (exists > 0) {
            throw new http_exception_1.HttpException(409, 'User with this email already exists');
        }
        const passwordHash = await (0, password_1.hashPassword)(data.password || 'Temporary123!'); // Default temp password or generate random
        return this.userRepository.create({
            email,
            name: data.name,
            role: data.role,
            password_hash: passwordHash,
            status: 'PENDING_VERIFICATION',
            company: { connect: { id: companyId } },
            role_assigner: { connect: { id: creatorId } },
        });
    }
    async updateUser(id, data) {
        const user = await this.userRepository.findById(id);
        if (!user)
            throw new http_exception_1.HttpException(404, 'User not found');
        if (data.email) {
            data.email = (0, email_1.normalizeEmail)(data.email);
            const exists = await this.userRepository.countByEmail(data.email, id);
            if (exists > 0)
                throw new http_exception_1.HttpException(409, 'Email already in use');
        }
        if (data.password) {
            data.password_hash = await (0, password_1.hashPassword)(data.password);
            delete data.password;
        }
        return this.userRepository.update(id, data);
    }
    async deleteUser(id) {
        return this.userRepository.delete(id);
    }
    async getUser(id) {
        const user = await this.userRepository.findById(id);
        if (!user)
            throw new http_exception_1.HttpException(404, 'User not found');
        return user;
    }
    async getUsersByCompany(companyId) {
        return this.userRepository.findByCompanyId(companyId);
    }
    // --- Notification Preferences ---
    async getNotificationPreferences(userId) {
        const prefs = await this.userRepository.getNotificationPreferences(userId);
        // Default preferences structure matches frontend expectations
        const defaultEventPrefs = {
            new_application: { enabled: true, channels: ['email', 'in-app'] },
            application_status_change: { enabled: true, channels: ['email', 'in-app'] },
            interview_scheduled: { enabled: true, channels: ['email', 'in-app'] },
            job_posted: { enabled: true, channels: ['email', 'in-app'] },
            payment_received: { enabled: true, channels: ['email', 'in-app'] },
            payment_failed: { enabled: true, channels: ['email', 'in-app'] },
            subscription_change: { enabled: true, channels: ['email', 'in-app'] },
            system_announcement: { enabled: true, channels: ['email', 'in-app'] },
            user_signup: { enabled: true, channels: ['email', 'in-app'] },
            support_ticket: { enabled: true, channels: ['email', 'in-app'] },
        };
        const defaultQuietHours = { enabled: false, start: '22:00', end: '08:00' };
        if (!prefs) {
            // Return defaults mapped to camelCase for API
            return {
                userId,
                eventPreferences: defaultEventPrefs,
                quietHours: defaultQuietHours,
            };
        }
        // Map DB snake_case to API camelCase
        return {
            userId: prefs.user_id,
            eventPreferences: prefs.event_preferences || defaultEventPrefs,
            quietHours: prefs.quiet_hours || defaultQuietHours,
        };
    }
    async updateNotificationPreferences(userId, data) {
        // Map API camelCase to DB snake_case
        const dbData = {};
        if (data.eventPreferences)
            dbData.event_preferences = data.eventPreferences;
        if (data.quietHours)
            dbData.quiet_hours = data.quietHours;
        const prefs = await this.userRepository.updateNotificationPreferences(userId, {
            ...dbData,
            user: { connect: { id: userId } }
        });
        return {
            userId: prefs.user_id,
            eventPreferences: prefs.event_preferences,
            quietHours: prefs.quiet_hours,
        };
    }
    // --- Alert Rules ---
    async getAlertRules(userId) {
        return this.userRepository.getAlertRules(userId);
    }
    async createAlertRule(userId, data) {
        return this.userRepository.createAlertRule({
            ...data,
            user: { connect: { id: userId } }
        });
    }
    async updateAlertRule(id, data) {
        return this.userRepository.updateAlertRule(id, data);
    }
    async deleteAlertRule(id) {
        return this.userRepository.deleteAlertRule(id);
    }
}
exports.UserService = UserService;
