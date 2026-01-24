"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetTokenRepository = exports.PasswordResetTokenRepository = void 0;
const repository_1 = require("../../core/repository");
class PasswordResetTokenRepository extends repository_1.BaseRepository {
    async invalidateActiveTokensForUser(userId) {
        // Stub
    }
    async create(data) {
        // Stub
    }
    async findByTokenHash(hash) {
        // Stub
        return null;
    }
    async markAsUsed(id) {
        // Stub
    }
}
exports.PasswordResetTokenRepository = PasswordResetTokenRepository;
exports.passwordResetTokenRepository = new PasswordResetTokenRepository();
