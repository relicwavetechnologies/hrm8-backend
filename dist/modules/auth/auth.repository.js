"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const repository_1 = require("../../core/repository");
class AuthRepository extends repository_1.BaseRepository {
    async findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }
    async create(data) {
        return this.prisma.user.create({
            data,
        });
    }
    async update(id, data) {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }
    async updateLastLogin(id) {
        return this.prisma.user.update({
            where: { id },
            data: { last_login_at: new Date() },
        });
    }
    // Session Management
    async createSession(data) {
        return this.prisma.session.create({
            data,
        });
    }
    async findSessionBySessionId(sessionId) {
        return this.prisma.session.findUnique({
            where: { session_id: sessionId },
            include: { user: true },
        });
    }
    async deleteSession(sessionId) {
        return this.prisma.session.delete({
            where: { session_id: sessionId },
        });
    }
    // Password Reset
    async createPasswordResetToken(data) {
        return this.prisma.passwordResetToken.create({
            data,
        });
    }
    async findPasswordResetToken(tokenHash) {
        return this.prisma.passwordResetToken.findUnique({
            where: { token_hash: tokenHash },
            include: { user: true },
        });
    }
    async markPasswordResetTokenUsed(id) {
        return this.prisma.passwordResetToken.update({
            where: { id },
            data: { used_at: new Date() },
        });
    }
    // Signup Requests
    async createSignupRequest(data) {
        return this.prisma.signupRequest.create({
            data,
        });
    }
    // Verification Tokens
    async createVerificationToken(data) {
        return this.prisma.verificationToken.create({
            data,
        });
    }
    async findVerificationToken(token) {
        return this.prisma.verificationToken.findUnique({
            where: { token },
            include: { company: true },
        });
    }
    async markVerificationTokenUsed(id) {
        return this.prisma.verificationToken.update({
            where: { id },
            data: { used_at: new Date() },
        });
    }
    async findUsersByCompanyId(companyId) {
        return this.prisma.user.findMany({
            where: { company_id: companyId },
        });
    }
}
exports.AuthRepository = AuthRepository;
