"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const controller_1 = require("../../core/controller");
const user_service_1 = require("./user.service");
const user_repository_1 = require("./user.repository");
class UserController extends controller_1.BaseController {
    constructor() {
        super();
        // User Management
        this.getUsers = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const users = await this.userService.getUsersByCompany(req.user.companyId);
                // Filter sensitive data
                const safeUsers = users.map(u => {
                    const { password_hash, ...rest } = u;
                    return rest;
                });
                return this.sendSuccess(res, { users: safeUsers });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getUser = async (req, res) => {
            try {
                const { id } = req.params;
                const user = await this.userService.getUser(id);
                const { password_hash, ...safeUser } = user;
                return this.sendSuccess(res, { user: safeUser });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createUser = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const user = await this.userService.createUser(req.user.companyId, req.user.id, req.body);
                const { password_hash, ...safeUser } = user;
                return this.sendSuccess(res, { user: safeUser });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateUser = async (req, res) => {
            try {
                const { id } = req.params;
                const user = await this.userService.updateUser(id, req.body);
                const { password_hash, ...safeUser } = user;
                return this.sendSuccess(res, { user: safeUser });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteUser = async (req, res) => {
            try {
                const { id } = req.params;
                await this.userService.deleteUser(id);
                return this.sendSuccess(res, { message: 'User deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Notification Preferences
        this.getNotificationPreferences = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const preferences = await this.userService.getNotificationPreferences(req.user.id);
                return this.sendSuccess(res, { preferences });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateNotificationPreferences = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const preferences = await this.userService.updateNotificationPreferences(req.user.id, req.body);
                return this.sendSuccess(res, { preferences });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Alert Rules
        this.getAlertRules = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const rules = await this.userService.getAlertRules(req.user.id);
                return this.sendSuccess(res, { rules });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createAlertRule = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const rule = await this.userService.createAlertRule(req.user.id, req.body);
                return this.sendSuccess(res, { rule });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateAlertRule = async (req, res) => {
            try {
                const { id } = req.params;
                const rule = await this.userService.updateAlertRule(id, req.body);
                return this.sendSuccess(res, { rule });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteAlertRule = async (req, res) => {
            try {
                const { id } = req.params;
                await this.userService.deleteAlertRule(id);
                return this.sendSuccess(res, { message: 'Alert rule deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.userService = new user_service_1.UserService(new user_repository_1.UserRepository());
    }
}
exports.UserController = UserController;
