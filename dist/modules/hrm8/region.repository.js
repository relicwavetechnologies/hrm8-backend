"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionRepository = void 0;
const prisma_1 = require("../../utils/prisma");
class RegionRepository {
    async create(data) {
        return prisma_1.prisma.region.create({ data });
    }
    async findById(id) {
        return prisma_1.prisma.region.findUnique({
            where: { id },
            include: {
                licensee: true,
            }
        });
    }
    async findByCode(code) {
        return prisma_1.prisma.region.findUnique({
            where: { code }
        });
    }
    async findMany(params) {
        return prisma_1.prisma.region.findMany({
            ...params,
            include: {
                licensee: true,
                _count: {
                    select: {
                        companies: true,
                        jobs: true,
                        consultants: true
                    }
                }
            }
        });
    }
    async update(id, data) {
        return prisma_1.prisma.region.update({ where: { id }, data });
    }
    async delete(id) {
        return prisma_1.prisma.region.delete({ where: { id } });
    }
    async count(where) {
        return prisma_1.prisma.region.count({ where });
    }
    async assignLicensee(regionId, licenseeId) {
        return prisma_1.prisma.region.update({
            where: { id: regionId },
            data: {
                licensee: { connect: { id: licenseeId } },
                owner_type: 'LICENSEE'
            }
        });
    }
    async unassignLicensee(regionId) {
        return prisma_1.prisma.region.update({
            where: { id: regionId },
            data: {
                licensee: { disconnect: true },
                owner_type: 'HRM8'
            }
        });
    }
}
exports.RegionRepository = RegionRepository;
