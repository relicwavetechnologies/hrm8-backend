"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const repository_1 = require("../../core/repository");
class UserRepository extends repository_1.BaseRepository {
    async create(data) {
        return this.prisma.user.create({ data });
    }
    async update(id, data) {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }
    async updatePassword(id, passwordHash, status) {
        return this.prisma.user.update({
            where: { id },
            data: {
                password_hash: passwordHash,
                ...(status ? { status } : {}),
            },
        });
    }
    async delete(id) {
        return this.prisma.user.delete({
            where: { id },
        });
    }
    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    async findByCompanyId(companyId) {
        return this.prisma.user.findMany({
            where: { company_id: companyId },
            orderBy: { created_at: 'desc' },
        });
    }
    async findByCompanyIdAndRole(companyId, role) {
        return this.prisma.user.findMany({
            where: {
                company_id: companyId,
                role,
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async countByEmail(email, excludeId) {
        return this.prisma.user.count({
            where: {
                email: email,
                ...(excludeId ? { NOT: { id: excludeId } } : {}),
            },
        });
    }
    // Notification Preferences
    async getNotificationPreferences(userId) {
        return this.prisma.userNotificationPreferences.findUnique({
            where: { user_id: userId },
        });
    }
    async updateNotificationPreferences(userId, data) {
        return this.prisma.userNotificationPreferences.upsert({
            where: { user_id: userId },
            create: data,
            update: data,
        });
    }
    // Alert Rules
    async getAlertRules(userId) {
        return this.prisma.userAlertRule.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
        });
    }
    async createAlertRule(data) {
        return this.prisma.userAlertRule.create({ data });
    }
    async updateAlertRule(id, data) {
        return this.prisma.userAlertRule.update({
            where: { id },
            data,
        });
    }
    async deleteAlertRule(id) {
        return this.prisma.userAlertRule.delete({ where: { id } });
    }
}
exports.UserRepository = UserRepository;
