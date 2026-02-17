"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareersRequestRepository = void 0;
const repository_1 = require("../../core/repository");
const prisma_1 = require("../../utils/prisma");
class CareersRequestRepository extends repository_1.BaseRepository {
    async findMany(params) {
        return prisma_1.prisma.company.findMany({
            ...params,
            where: {
                ...params.where,
                careers_page_status: {
                    in: ['PENDING', 'APPROVED', 'REJECTED']
                }
            }
        });
    }
    async findUnique(id) {
        return prisma_1.prisma.company.findUnique({
            where: { id },
        });
    }
    async update(id, data) {
        return prisma_1.prisma.company.update({
            where: { id },
            data,
        });
    }
}
exports.CareersRequestRepository = CareersRequestRepository;
