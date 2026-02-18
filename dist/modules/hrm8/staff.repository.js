"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffRepository = void 0;
const prisma_1 = require("../../utils/prisma");
class StaffRepository {
    async create(data) {
        return prisma_1.prisma.consultant.create({ data });
    }
    async findById(id) {
        return prisma_1.prisma.consultant.findUnique({
            where: { id },
            include: {
                region: true,
            }
        });
    }
    async findByEmail(email) {
        return prisma_1.prisma.consultant.findUnique({
            where: { email }
        });
    }
    async findMany(params) {
        return prisma_1.prisma.consultant.findMany({
            ...params,
            include: {
                region: true,
                _count: {
                    select: {
                        job_assignments: { where: { status: 'ACTIVE' } }
                    }
                }
            }
        });
    }
    async update(id, data) {
        return prisma_1.prisma.consultant.update({ where: { id }, data });
    }
    async delete(id) {
        return prisma_1.prisma.consultant.delete({ where: { id } });
    }
    async count(where) {
        return prisma_1.prisma.consultant.count({ where });
    }
}
exports.StaffRepository = StaffRepository;
