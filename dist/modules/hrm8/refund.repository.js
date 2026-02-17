"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundRepository = void 0;
const prisma_1 = require("../../utils/prisma");
class RefundRepository {
    async findMany(params) {
        return prisma_1.prisma.transactionRefundRequest.findMany({
            ...params,
            include: {
                company: {
                    select: { id: true, name: true }
                }
            }
        });
    }
    async findUnique(id) {
        return prisma_1.prisma.transactionRefundRequest.findUnique({
            where: { id },
            include: {
                company: {
                    select: { id: true, name: true }
                }
            }
        });
    }
    async update(id, data) {
        return prisma_1.prisma.transactionRefundRequest.update({ where: { id }, data });
    }
    async count(where) {
        return prisma_1.prisma.transactionRefundRequest.count({ where });
    }
}
exports.RefundRepository = RefundRepository;
