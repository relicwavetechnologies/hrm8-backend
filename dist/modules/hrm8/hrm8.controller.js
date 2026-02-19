"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hrm8Controller = void 0;
const controller_1 = require("../../core/controller");
const hrm8_service_1 = require("./hrm8.service");
const hrm8_repository_1 = require("./hrm8.repository");
const session_1 = require("../../utils/session");
const settings_overview_service_1 = require("./settings-overview.service");
class Hrm8Controller extends controller_1.BaseController {
    constructor() {
        super();
        this.login = async (req, res) => {
            try {
                const { email, password } = req.body;
                const { user, sessionId, regionIds } = await this.hrm8Service.login({ email, password });
                const cookieOptions = (0, session_1.getSessionCookieOptions)();
                res.cookie('hrm8SessionId', sessionId, cookieOptions);
                const { password_hash, ...userData } = user;
                return this.sendSuccess(res, {
                    hrm8User: { ...userData, regionIds }
                });
            }
            catch (error) {
                console.error(`[Hrm8Controller.login] Login error:`, error);
                return this.sendError(res, error);
            }
        };
        this.logout = async (req, res) => {
            try {
                const sessionId = req.cookies?.hrm8SessionId;
                if (sessionId) {
                    await this.hrm8Service.logout(sessionId);
                }
                res.clearCookie('hrm8SessionId', (0, session_1.getSessionCookieOptions)());
                return this.sendSuccess(res, { message: 'Logged out successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getCurrentUser = async (req, res) => {
            try {
                if (!req.hrm8User)
                    return this.sendError(res, new Error('Not authenticated'));
                const { user, regionIds } = await this.hrm8Service.getProfile(req.hrm8User.id);
                const { password_hash, ...userData } = user;
                return this.sendSuccess(res, {
                    hrm8User: { ...userData, regionIds }
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.changePassword = async (req, res) => {
            try {
                if (!req.hrm8User)
                    return this.sendError(res, new Error('Not authenticated'));
                const { currentPassword, newPassword } = req.body;
                await this.hrm8Service.changePassword(req.hrm8User.id, currentPassword, newPassword);
                return this.sendSuccess(res, { message: 'Password changed successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getProfileDetail = async (req, res) => {
            try {
                if (!req.hrm8User)
                    return this.sendError(res, new Error('Not authenticated'));
                const result = await this.hrm8Service.getProfileDetail(req.hrm8User.id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateProfileDetail = async (req, res) => {
            try {
                if (!req.hrm8User)
                    return this.sendError(res, new Error('Not authenticated'));
                const result = await this.hrm8Service.updateProfileDetail(req.hrm8User.id, req.body || {});
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        /**
         * Get system overview with aggregated metrics
         * GET /hrm8/settings/overview
         */
        this.getSystemOverview = async (req, res) => {
            try {
                const overviewService = new settings_overview_service_1.SettingsOverviewService();
                const overview = await overviewService.getOverview();
                res.json({ success: true, data: overview });
            }
            catch (error) {
                console.error('Get system overview error:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch system overview' });
            }
        };
        this.hrm8Service = new hrm8_service_1.Hrm8Service(new hrm8_repository_1.Hrm8Repository());
    }
}
exports.Hrm8Controller = Hrm8Controller;
