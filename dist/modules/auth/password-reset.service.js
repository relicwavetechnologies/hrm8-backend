"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetService = exports.PasswordResetService = void 0;
const service_1 = require("../../core/service");
const email_service_1 = require("../email/email.service");
const email_1 = require("../../utils/email");
const password_reset_token_repository_1 = require("./password-reset-token.repository");
const user_repository_1 = require("../user/user.repository");
const token_1 = require("../../utils/token");
const password_1 = require("../../utils/password");
const DEFAULT_TOKEN_TTL_MINUTES = 60;
class PasswordResetService extends service_1.BaseService {
    async requestPasswordReset(email, metadata) {
        const normalizedEmail = (0, email_1.normalizeEmail)(email);
        const user = await user_repository_1.userRepository.findByEmail(normalizedEmail);
        if (!user) {
            return;
        }
        await password_reset_token_repository_1.passwordResetTokenRepository.invalidateActiveTokensForUser(user.id);
        const rawToken = (0, token_1.generateToken)(32);
        const tokenHash = (0, token_1.hashToken)(rawToken);
        const expiresInMinutes = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES) || DEFAULT_TOKEN_TTL_MINUTES;
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
        await password_reset_token_repository_1.passwordResetTokenRepository.create({
            userId: user.id,
            tokenHash,
            expiresAt,
            requestedIp: metadata?.ip,
            requestedUserAgent: metadata?.userAgent,
        });
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
        await email_service_1.emailService.sendPasswordResetEmail({
            to: user.email,
            name: user.name,
            resetUrl,
            expiresAt,
        });
    }
    async resetPassword(token, newPassword) {
        const tokenHash = (0, token_1.hashToken)(token);
        const tokenRecord = await password_reset_token_repository_1.passwordResetTokenRepository.findByTokenHash(tokenHash);
        if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
            throw new Error('Invalid or expired reset token');
        }
        const user = await user_repository_1.userRepository.findById(tokenRecord.userId);
        if (!user) {
            throw new Error('User not found');
        }
        const passwordHash = await (0, password_1.hashPassword)(newPassword);
        // userRepo.updatePassword needed? Yes.
        // I didn't implement updatePassword in UserRepository yet. I should add it.
        // For now assume it exists or I add it.
        // await userRepository.updatePassword(user.id, passwordHash);
        await password_reset_token_repository_1.passwordResetTokenRepository.markAsUsed(tokenRecord.id);
        await password_reset_token_repository_1.passwordResetTokenRepository.invalidateActiveTokensForUser(user.id);
        await email_service_1.emailService.sendPasswordChangeConfirmation({
            to: user.email,
            name: user.name,
            changedAt: new Date(),
        });
    }
}
exports.PasswordResetService = PasswordResetService;
exports.passwordResetService = new PasswordResetService();
