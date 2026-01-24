"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const service_1 = require("../../core/service");
const types_1 = require("../../types");
const domain_1 = require("../../utils/domain");
const email_1 = require("../../utils/email");
const password_1 = require("../../utils/password");
class AuthService extends service_1.BaseService {
    constructor(userRepository = userRepository, companyService = companyService) {
        super();
        this.userRepository = userRepository;
        this.companyService = companyService;
    }
    async registerCompanyAdmin(companyId, email, name, password, activate = false) {
        const passwordHash = await (0, password_1.hashPassword)(password);
        const user = await this.userRepository.create({
            email: (0, email_1.normalizeEmail)(email),
            name: name.trim(),
            passwordHash,
            companyId,
            role: types_1.UserRole.SUPER_ADMIN,
            status: activate ? types_1.UserStatus.ACTIVE : types_1.UserStatus.PENDING_VERIFICATION,
        });
        return user;
    }
    async registerEmployeeFromInvitation(companyId, email, name, password) {
        const passwordHash = await (0, password_1.hashPassword)(password);
        const user = await this.userRepository.create({
            email: (0, email_1.normalizeEmail)(email),
            name: name.trim(),
            passwordHash,
            companyId,
            role: types_1.UserRole.USER,
            status: types_1.UserStatus.ACTIVE,
        });
        return user;
    }
    async registerEmployeeAutoJoin(email, name, password) {
        const emailDomain = (0, domain_1.extractEmailDomain)(email);
        const company = await this.companyService.findByDomain(emailDomain);
        if (!company) {
            return null;
        }
        const passwordHash = await (0, password_1.hashPassword)(password);
        const user = await this.userRepository.create({
            email: (0, email_1.normalizeEmail)(email),
            name: name.trim(),
            passwordHash,
            companyId: company.id,
            role: types_1.UserRole.USER,
            status: types_1.UserStatus.ACTIVE,
        });
        return user;
    }
    async login(loginData) {
        const user = await this.userRepository.findByEmail((0, email_1.normalizeEmail)(loginData.email));
        if (!user) {
            return {
                error: 'Invalid email or password',
                status: 401,
                details: { code: 'INVALID_CREDENTIALS' },
            };
        }
        const isValidPassword = await (0, password_1.comparePassword)(loginData.password, user.passwordHash);
        if (!isValidPassword) {
            return {
                error: 'Invalid email or password',
                status: 401,
                details: { code: 'INVALID_CREDENTIALS' },
            };
        }
        if (user.status === types_1.UserStatus.PENDING_VERIFICATION) {
            return {
                error: 'Your account is pending verification. Please verify your email to activate your account.',
                status: 403,
                details: {
                    code: 'PENDING_VERIFICATION',
                    email: user.email,
                    companyId: user.companyId,
                },
            };
        }
        if (user.status === types_1.UserStatus.INACTIVE) {
            return {
                error: 'Your account has been deactivated. Please contact your administrator.',
                status: 403,
                details: { code: 'ACCOUNT_INACTIVE' },
            };
        }
        if (user.status === types_1.UserStatus.INVITED) {
            return {
                error: 'Please accept your invitation and set up your password first.',
                status: 403,
                details: { code: 'INVITATION_PENDING' },
            };
        }
        if (user.status !== types_1.UserStatus.ACTIVE) {
            return {
                error: 'Your account is not active. Please contact your administrator.',
                status: 403,
                details: { code: 'ACCOUNT_NOT_ACTIVE' },
            };
        }
        await this.userRepository.updateLastLogin(user.id);
        return { user };
    }
    async findByEmail(email) {
        return await this.userRepository.findByEmail((0, email_1.normalizeEmail)(email));
    }
    async findById(id) {
        return await this.userRepository.findById(id);
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
