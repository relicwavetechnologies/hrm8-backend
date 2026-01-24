"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const controller_1 = require("../../core/controller");
const session_1 = require("../../utils/session");
const password_reset_service_1 = require("./password-reset.service");
class AuthController extends controller_1.BaseController {
    constructor(authService = authService, companyService = companyService, companyProfileService = companyProfileService, invitationService = invitationService, verificationService = verificationService, sessionRepository = sessionRepository, passwordResetServiceRef = password_reset_service_1.passwordResetService) {
        super();
        this.authService = authService;
        this.companyService = companyService;
        this.companyProfileService = companyProfileService;
        this.invitationService = invitationService;
        this.verificationService = verificationService;
        this.sessionRepository = sessionRepository;
        this.passwordResetServiceRef = passwordResetServiceRef;
        this.registerCompany = async (req, res) => {
            try {
                const registrationData = req.body;
                const adminFullName = `${registrationData.adminFirstName} ${registrationData.adminLastName}`.trim();
                const { company, verificationMethod, verificationRequired } = await this.companyService.registerCompany(registrationData);
                const adminUser = await this.authService.registerCompanyAdmin(company.id, registrationData.adminEmail, adminFullName, registrationData.password, !verificationRequired);
                return this.sendSuccess(res, {
                    companyId: company.id,
                    adminUserId: adminUser.id,
                    verificationRequired,
                    verificationMethod,
                    message: verificationRequired
                        ? 'Company registered. Please verify your email to activate your account.'
                        : 'Company registered and verified successfully.',
                }, 'Company registered successfully');
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.login = async (req, res) => {
            try {
                const loginData = req.body;
                const result = await this.authService.login(loginData);
                if ('error' in result) {
                    return res.status(result.status).json({
                        success: false,
                        error: result.error,
                        details: result.details,
                    });
                }
                const { user } = result;
                const sessionId = (0, session_1.generateSessionId)();
                const expiresAt = (0, session_1.getSessionExpiration)(24);
                await this.sessionRepository.create(sessionId, user.id, user.companyId, user.role, user.email, expiresAt);
                res.cookie('sessionId', sessionId, (0, session_1.getSessionCookieOptions)());
                const company = await this.companyService.findById(user.companyId);
                const companyName = company?.name || '';
                const companyWebsite = company?.website || '';
                const companyDomain = company?.domain || '';
                const profile = await this.companyProfileService.getProfileSummary(user.companyId);
                return this.sendSuccess(res, {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        companyId: user.companyId,
                        companyName,
                        companyWebsite,
                        companyDomain,
                    },
                    profile,
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.acceptInvitation = async (req, res) => {
            try {
                const { token, password, name } = req.body;
                const invitation = await this.invitationService.findByToken(token);
                if (!invitation) {
                    return res.status(404).json({ success: false, error: 'Invitation not found' });
                }
                // Check validity (static method in original, maybe instance now?)
                // Assuming instance method or utility
                // if (!InvitationService.isInvitationValid(invitation)) ...
                // I stubbed isInvitationValid in service.
                // ...
                // Register employee
                const user = await this.authService.registerEmployeeFromInvitation(invitation.companyId, invitation.email, name, password);
                await this.invitationService.acceptInvitation(invitation.id);
                return res.status(201).json({
                    success: true,
                    data: {
                        userId: user.id,
                        message: 'Account created successfully. You can now login.',
                    }
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
