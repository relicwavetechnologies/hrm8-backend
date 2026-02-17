"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const service_1 = require("../../core/service");
const password_1 = require("../../utils/password");
const email_1 = require("../../utils/email");
const http_exception_1 = require("../../core/http-exception");
const session_1 = require("../../utils/session");
const email_service_1 = require("../email/email.service");
const env_1 = require("../../config/env");
class AuthService extends service_1.BaseService {
    constructor(authRepository, companyRepository) {
        super();
        this.authRepository = authRepository;
        this.companyRepository = companyRepository;
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
    async signup(data) {
        const domain = data.companyDomain || data.businessEmail.split('@')[1];
        let company = await this.companyRepository.findByDomain(domain);
        // If not found, try to find by parent domains (e.g., nst.rishihood.edu.in -> rishihood.edu.in)
        if (!company && domain.includes('.')) {
            const parts = domain.split('.');
            // Try each parent domain, e.g., for a.b.c.com, try b.c.com and c.com
            // But stop if we only have 2 parts (like google.com) or if the remaining part is a common TLD
            for (let i = 1; i < parts.length - 1; i++) {
                const parentDomain = parts.slice(i).join('.');
                company = await this.companyRepository.findByDomain(parentDomain);
                if (company)
                    break;
            }
        }
        if (!company) {
            throw new http_exception_1.HttpException(404, `Company with domain ${domain} not found. Please contact your administrator or register your company.`);
        }
        const passwordHash = await (0, password_1.hashPassword)(data.password);
        const signupRequest = await this.authRepository.createSignupRequest({
            email: (0, email_1.normalizeEmail)(data.businessEmail),
            name: `${data.firstName} ${data.lastName}`.trim(),
            first_name: data.firstName,
            last_name: data.lastName,
            password_hash: passwordHash,
            accepted_terms: data.acceptTerms,
            company: { connect: { id: company.id } },
            status: 'PENDING'
        });
        // Notify company admins
        try {
            const admins = await this.authRepository.findUsersByCompanyId(company.id);
            const adminEmails = admins
                .filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
                .map(u => u.email);
            if (adminEmails.length > 0) {
                const title = 'New Access Request';
                const message = `<strong>${data.firstName} ${data.lastName}</strong> (${data.businessEmail}) has requested access to join <strong>${company.name}</strong> on HRM8. <br/><br/>Please log in to your dashboard to review and approve/reject this request.`;
                console.log(`[AuthService.signup] Sending access request notifications to: ${adminEmails.join(', ')}`);
                for (const email of adminEmails) {
                    await email_service_1.emailService.sendNotificationEmail(email, title, message, '/users');
                }
            }
            else {
                console.warn(`[AuthService.signup] No admins found for company ${company.id} to notify about signup request.`);
            }
        }
        catch (error) {
            console.error('[AuthService.signup] Failed to send notification to admins:', error);
            // Don't fail the signup if notification fails
        }
        return {
            requestId: signupRequest.id,
            message: 'Signup request submitted successfully. Please wait for admin approval.'
        };
    }
    async registerCompany(data) {
        const domain = data.companyWebsite.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        // 1. Create Company
        const company = await this.companyRepository.create({
            name: data.companyName,
            website: data.companyWebsite,
            domain: domain,
            country_or_region: data.countryOrRegion,
            accepted_terms: data.acceptTerms,
            verification_status: 'PENDING'
        });
        // 2. Create Admin User
        const passwordHash = await (0, password_1.hashPassword)(data.password);
        const user = await this.authRepository.create({
            email: (0, email_1.normalizeEmail)(data.adminEmail),
            name: `${data.adminFirstName} ${data.adminLastName}`.trim(),
            password_hash: passwordHash,
            company: { connect: { id: company.id } },
            role: 'ADMIN',
            status: 'PENDING_VERIFICATION'
        });
        // 3. Create Verification Token
        const token = (0, session_1.generateToken)();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours
        await this.authRepository.createVerificationToken({
            company: { connect: { id: company.id } },
            email: user.email,
            token,
            expires_at: expiresAt
        });
        // 4. Send Verification Email
        const verificationUrl = `${env_1.env.ATS_FRONTEND_URL}/verify-company?token=${token}&companyId=${company.id}`;
        await email_service_1.emailService.sendCandidateVerificationEmail({
            to: user.email,
            name: user.name,
            verificationUrl
        });
        return {
            companyId: company.id,
            adminUserId: user.id,
            verificationRequired: true,
            verificationMethod: 'EMAIL',
            message: 'Company registered successfully. Please verify your email.'
        };
    }
    async verifyCompany(token, companyId) {
        const verificationToken = await this.authRepository.findVerificationToken(token);
        if (!verificationToken || verificationToken.company_id !== companyId) {
            throw new http_exception_1.HttpException(400, 'Invalid verification token');
        }
        if (verificationToken.used_at) {
            throw new http_exception_1.HttpException(400, 'Token already used');
        }
        if (new Date() > verificationToken.expires_at) {
            throw new http_exception_1.HttpException(400, 'Token expired');
        }
        // Mark token as used
        await this.authRepository.markVerificationTokenUsed(verificationToken.id);
        // Update company status
        await this.companyRepository.update(companyId, {
            verification_status: 'VERIFIED',
            verified_at: new Date()
        });
        // Update user status
        const users = await this.authRepository.findUsersByCompanyId(companyId);
        for (const user of users) {
            await this.authRepository.update(user.id, { status: 'ACTIVE' });
        }
        const admin = users.find(u => u.role === 'ADMIN') || users[0];
        return {
            message: 'Email verified successfully',
            email: admin.email,
            user: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                companyId: admin.company_id
            }
        };
    }
    async resendVerification(email) {
        const user = await this.authRepository.findByEmail((0, email_1.normalizeEmail)(email));
        if (!user)
            throw new http_exception_1.HttpException(404, 'User not found');
        if (user.status === 'ACTIVE') {
            throw new http_exception_1.HttpException(400, 'Email already verified');
        }
        const token = (0, session_1.generateToken)();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        await this.authRepository.createVerificationToken({
            company: { connect: { id: user.company_id } },
            email: user.email,
            token,
            expires_at: expiresAt
        });
        const verificationUrl = `${env_1.env.ATS_FRONTEND_URL}/verify-company?token=${token}&companyId=${user.company_id}`;
        await email_service_1.emailService.sendCandidateVerificationEmail({
            to: user.email,
            name: user.name,
            verificationUrl
        });
        return {
            message: 'Verification email resent successfully',
            email: user.email,
            companyId: user.company_id,
            expiresAt: expiresAt.toISOString()
        };
    }
}
exports.AuthService = AuthService;
