import { prisma } from '../../utils/prisma';
import { Prisma, TransactionRefundRequest, RefundStatus } from '@prisma/client';

export class RefundRepository {
    async findMany(params: {
        where?: Prisma.TransactionRefundRequestWhereInput;
        orderBy?: Prisma.TransactionRefundRequestOrderByWithRelationInput;
        take?: number;
        skip?: number;
    }): Promise<TransactionRefundRequest[]> {
        return prisma.transactionRefundRequest.findMany({
            ...params,
            include: {
                company: {
                    select: { id: true, name: true }
                }
            }
        });
    }

    async findUnique(id: string): Promise<TransactionRefundRequest | null> {
        return prisma.transactionRefundRequest.findUnique({
            where: { id },
            include: {
                company: {
                    select: { id: true, name: true }
                }
            }
        });
    }

    async update(id: string, data: Prisma.TransactionRefundRequestUpdateInput): Promise<TransactionRefundRequest> {
        return prisma.transactionRefundRequest.update({ where: { id }, data });
    }

    async count(where?: Prisma.TransactionRefundRequestWhereInput): Promise<number> {
        return prisma.transactionRefundRequest.count({ where });
    }
}
