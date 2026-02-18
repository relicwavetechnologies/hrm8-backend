"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionRepository = void 0;
const prisma_1 = require("../../utils/prisma");
class CommissionRepository {
    async create(data) {
        return prisma_1.prisma.commission.create({ data });
    }
    async findById(id) {
        return prisma_1.prisma.commission.findUnique({ where: { id } });
    }
    async update(id, data) {
        return prisma_1.prisma.commission.update({ where: { id }, data });
    }
    async findMany(params) {
        return prisma_1.prisma.commission.findMany(params);
    }
    async count(where) {
        return prisma_1.prisma.commission.count({ where });
    }
    // Withdrawal Methods
    async createWithdrawal(data) {
        return prisma_1.prisma.commissionWithdrawal.create({ data });
    }
    async findWithdrawalById(id) {
        return prisma_1.prisma.commissionWithdrawal.findUnique({ where: { id } });
    }
    async updateWithdrawal(id, data) {
        return prisma_1.prisma.commissionWithdrawal.update({ where: { id }, data });
    }
    async findWithdrawals(params) {
        return prisma_1.prisma.commissionWithdrawal.findMany(params);
    }
    async countWithdrawals(where) {
        return prisma_1.prisma.commissionWithdrawal.count({ where });
    }
    async transaction(fn) {
        return prisma_1.prisma.$transaction(fn);
    }
}
exports.CommissionRepository = CommissionRepository;
