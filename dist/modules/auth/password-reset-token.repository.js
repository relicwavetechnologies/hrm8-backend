"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetTokenRepository = exports.PasswordResetTokenRepository = void 0;
const repository_1 = require("../../core/repository");
class PasswordResetTokenRepository extends repository_1.BaseRepository {
    async invalidateActiveTokensForUser(userId) {
        return this.prisma.passwordResetToken.updateMany({
            where: {
                user_id: userId,
                used_at: null,
                expires_at: { gt: new Date() },
            },
            data: { used_at: new Date() },
        });
    }
    async create(data) {
        return this.prisma.passwordResetToken.create({ data });
    }
    async findByTokenHash(hash) {
        return this.prisma.passwordResetToken.findUnique({
            where: { token_hash: hash },
        });
    }
    async markAsUsed(id) {
        return this.prisma.passwordResetToken.update({
            where: { id },
            data: { used_at: new Date() },
        });
    }
}
exports.PasswordResetTokenRepository = PasswordResetTokenRepository;
exports.passwordResetTokenRepository = new PasswordResetTokenRepository();
