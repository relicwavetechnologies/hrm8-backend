"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const service_1 = require("../../core/service");
const password_1 = require("../../utils/password");
const email_1 = require("../../utils/email");
const http_exception_1 = require("../../core/http-exception");
const session_1 = require("../../utils/session");
class AuthService extends service_1.BaseService {
    constructor(authRepository) {
        super();
        this.authRepository = authRepository;
    }
    async login(data) {
        const user = await this.authRepository.findByEmail((0, email_1.normalizeEmail)(data.email));
        if (!user) {
            throw new http_exception_1.HttpException(401, 'Invalid credentials');
        }
        const isValid = await (0, password_1.comparePassword)(data.password, user.password_hash);
        if (!isValid) {
            throw new http_exception_1.HttpException(401, 'Invalid credentials');
        }
        if (user.status !== 'ACTIVE') {
            throw new http_exception_1.HttpException(403, `Account status: ${user.status}`);
        }
        // Update last login
        await this.authRepository.updateLastLogin(user.id);
        // Create session
        const sessionId = (0, session_1.generateSessionId)();
        const expiresAt = (0, session_1.getSessionExpiration)();
        await this.authRepository.createSession({
            session_id: sessionId,
            user: { connect: { id: user.id } },
            email: user.email,
            expires_at: expiresAt,
            company_id: user.company_id,
            user_role: user.role
        });
        return { user, sessionId };
    }
    async createSessionForUser(user) {
        await this.authRepository.updateLastLogin(user.id);
        const sessionId = (0, session_1.generateSessionId)();
        const expiresAt = (0, session_1.getSessionExpiration)();
        await this.authRepository.createSession({
            session_id: sessionId,
            user: { connect: { id: user.id } },
            email: user.email,
            expires_at: expiresAt,
            company_id: user.company_id,
            user_role: user.role
        });
        return { user, sessionId };
    }
    async logout(sessionId) {
        await this.authRepository.deleteSession(sessionId);
    }
    async registerCompanyAdmin(companyId, email, name, password, activate = false) {
        const passwordHash = await (0, password_1.hashPassword)(password);
        return this.authRepository.create({
            email: (0, email_1.normalizeEmail)(email),
            name: name.trim(),
            password_hash: passwordHash,
            company: { connect: { id: companyId } },
            role: 'ADMIN', // Using string literal matching Prisma enum if needed, or import UserRole
            status: activate ? 'ACTIVE' : 'PENDING_VERIFICATION',
        });
    }
    async registerEmployee(companyId, email, name, password) {
        const passwordHash = await (0, password_1.hashPassword)(password);
        return this.authRepository.create({
            email: (0, email_1.normalizeEmail)(email),
            name: name.trim(),
            password_hash: passwordHash,
            company: { connect: { id: companyId } },
            role: 'USER',
            status: 'ACTIVE',
        });
    }
    async getCurrentUser(userId) {
        const user = await this.authRepository.findById(userId);
        if (!user)
            throw new http_exception_1.HttpException(404, 'User not found');
        return user;
    }
}
exports.AuthService = AuthService;
