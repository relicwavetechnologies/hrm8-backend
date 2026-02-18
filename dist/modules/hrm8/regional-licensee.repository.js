"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionalLicenseeRepository = void 0;
const prisma_1 = require("../../utils/prisma");
class RegionalLicenseeRepository {
    async create(data) {
        return prisma_1.prisma.regionalLicensee.create({ data });
    }
    async findById(id) {
        return prisma_1.prisma.regionalLicensee.findUnique({
            where: { id },
            include: {
                regions: true
            }
        });
    }
    async findByEmail(email) {
        return prisma_1.prisma.regionalLicensee.findFirst({
            where: { email }
        });
    }
    async update(id, data) {
        return prisma_1.prisma.regionalLicensee.update({ where: { id }, data });
    }
    async delete(id) {
        return prisma_1.prisma.regionalLicensee.delete({ where: { id } });
    }
    async findMany(params) {
        return prisma_1.prisma.regionalLicensee.findMany({
            ...params,
            include: {
                _count: { select: { regions: true } }
            }
        });
    }
    async count(where) {
        return prisma_1.prisma.regionalLicensee.count({ where });
    }
    async getStats() {
        const [total, active, suspended] = await Promise.all([
            prisma_1.prisma.regionalLicensee.count(),
            prisma_1.prisma.regionalLicensee.count({ where: { status: 'ACTIVE' } }),
            prisma_1.prisma.regionalLicensee.count({ where: { status: 'SUSPENDED' } }),
        ]);
        return { total, active, suspended };
    }
}
exports.RegionalLicenseeRepository = RegionalLicenseeRepository;
