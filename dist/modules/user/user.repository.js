"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.UserRepository = void 0;
const repository_1 = require("../../core/repository");
class UserRepository extends repository_1.BaseRepository {
    async create(userData) {
        const user = await this.prisma.user.create({
            data: {
                email: userData.email.toLowerCase(),
                name: userData.name,
                password_hash: userData.passwordHash,
                company_id: userData.companyId,
                role: userData.role,
                status: userData.status,
                assigned_by: userData.assignedBy,
                last_login_at: userData.lastLoginAt,
            },
        });
        return this.mapPrismaToUser(user);
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        return user ? this.mapPrismaToUser(user) : null;
    }
    async findByEmail(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        return user ? this.mapPrismaToUser(user) : null;
    }
    async findByCompanyId(companyId) {
        const users = await this.prisma.user.findMany({
            where: { company_id: companyId },
            orderBy: { created_at: 'desc' },
        });
        return users.map(user => this.mapPrismaToUser(user));
    }
    async updateLastLogin(id) {
        const user = await this.prisma.user.update({
            where: { id },
            data: { last_login_at: new Date() },
        });
        return this.mapPrismaToUser(user);
    }
    async updatePassword(id, passwordHash) {
        const user = await this.prisma.user.update({
            where: { id },
            data: { password_hash: passwordHash },
        });
        return this.mapPrismaToUser(user);
    }
    async updateRole(id, role, assignedBy) {
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                role,
                assigned_by: assignedBy
            },
        });
        return this.mapPrismaToUser(user);
    }
    mapPrismaToUser(prismaUser) {
        return {
            id: prismaUser.id,
            email: prismaUser.email,
            name: prismaUser.name,
            passwordHash: prismaUser.password_hash,
            companyId: prismaUser.company_id,
            role: prismaUser.role,
            status: prismaUser.status,
            assignedBy: prismaUser.assigned_by || undefined,
            lastLoginAt: prismaUser.last_login_at || undefined,
            createdAt: prismaUser.created_at,
            updatedAt: prismaUser.updated_at,
        };
    }
}
exports.UserRepository = UserRepository;
exports.userRepository = new UserRepository();
