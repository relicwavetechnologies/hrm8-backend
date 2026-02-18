"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const controller_1 = require("../../core/controller");
const auth_service_1 = require("./auth.service");
const auth_repository_1 = require("./auth.repository");
const company_repository_1 = require("../company/company.repository");
const session_1 = require("../../utils/session");
const password_reset_service_1 = require("./password-reset.service");
class AuthController extends controller_1.BaseController {
    constructor() {
        super();
        this.login = async (req, res) => {
            try {
                const { email, password } = req.body;
                console.log(`[AuthController.login] Login attempt for email: ${email}`);
                const { user, sessionId } = await this.authService.login({ email, password });
                console.log(`[AuthController.login] Login successful, setting sessionId: ${sessionId}`);
                const cookieOptions = (0, session_1.getSessionCookieOptions)();
                console.log(`[AuthController.login] Cookie options:`, cookieOptions);
                res.cookie('sessionId', sessionId, cookieOptions);
                const { password_hash, ...userData } = user;
                return this.sendSuccess(res, {
                    user: {
                        ...userData,
                        companyId: user.company_id
                    }
                });
            }
            catch (error) {
                console.error(`[AuthController.login] Login error:`, error);
                return this.sendError(res, error);
            }
        };
        this.logout = async (req, res) => {
            try {
                const sessionId = req.cookies?.sessionId;
                if (sessionId) {
                    await this.authService.logout(sessionId);
                }
                res.clearCookie('sessionId', (0, session_1.getSessionCookieOptions)());
                return this.sendSuccess(res, { message: 'Logged out successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getCurrentUser = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const user = await this.authService.getCurrentUser(req.user.id);
                const { password_hash, ...userData } = user;
                return this.sendSuccess(res, {
                    user: {
                        ...userData,
                        companyId: user.company_id
                    }
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.acceptLeadConversionInvite = async (req, res) => {
            try {
                const { token, password } = req.body;
                if (!token || !password) {
                    return this.sendError(res, new Error('Token and password are required'));
                }
                const user = await password_reset_service_1.passwordResetService.acceptLeadConversionInvite(token, password);
                const { sessionId } = await this.authService.createSessionForUser(user);
                const cookieOptions = (0, session_1.getSessionCookieOptions)();
                res.cookie('sessionId', sessionId, cookieOptions);
                const { password_hash, ...userData } = user;
                return this.sendSuccess(res, {
                    user: { ...userData, companyId: user.company_id }
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.signup = async (req, res) => {
            try {
                const result = await this.authService.signup(req.body);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.registerCompany = async (req, res) => {
            try {
                const result = await this.authService.registerCompany(req.body);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.verifyCompany = async (req, res) => {
            try {
                const { token, companyId } = req.body;
                const result = await this.authService.verifyCompany(token, companyId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.resendVerification = async (req, res) => {
            try {
                const { email } = req.body;
                const result = await this.authService.resendVerification(email);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.forgotPassword = async (req, res) => {
            try {
                const { email } = req.body;
                await password_reset_service_1.passwordResetService.requestPasswordReset(email, {
                    ip: req.ip,
                    userAgent: req.get('user-agent'),
                });
                return this.sendSuccess(res, { message: 'If an account exists with that email, a password reset link has been sent.' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.resetPassword = async (req, res) => {
            try {
                const { token, password } = req.body;
                await password_reset_service_1.passwordResetService.resetPassword(token, password);
                return this.sendSuccess(res, { message: 'Password reset successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.authService = new auth_service_1.AuthService(new auth_repository_1.AuthRepository(), new company_repository_1.CompanyRepository());
    }
}
exports.AuthController = AuthController;
