"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadConversionRepository = void 0;
const prisma_1 = require("../../utils/prisma");
class LeadConversionRepository {
    async findMany(params) {
        return prisma_1.prisma.leadConversionRequest.findMany({
            ...params,
            include: {
                lead: true,
                consultant: {
                    select: { id: true, first_name: true, last_name: true, email: true }
                },
                region: true
            }
        });
    }
    async findUnique(id) {
        return prisma_1.prisma.leadConversionRequest.findUnique({
            where: { id },
            include: {
                lead: true,
                consultant: {
                    select: { id: true, first_name: true, last_name: true, email: true }
                },
                region: true
            }
        });
    }
    async update(id, data) {
        return prisma_1.prisma.leadConversionRequest.update({ where: { id }, data });
    }
    async count(where) {
        return prisma_1.prisma.leadConversionRequest.count({ where });
    }
}
exports.LeadConversionRepository = LeadConversionRepository;
