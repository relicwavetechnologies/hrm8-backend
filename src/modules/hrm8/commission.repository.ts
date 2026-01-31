import { Prisma, Commission, CommissionWithdrawal } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export class CommissionRepository {
    async create(data: Prisma.CommissionCreateInput): Promise<Commission> {
        return prisma.commission.create({ data });
    }

    async findById(id: string): Promise<Commission | null> {
        return prisma.commission.findUnique({ where: { id } });
    }

    async update(id: string, data: Prisma.CommissionUpdateInput): Promise<Commission> {
        return prisma.commission.update({ where: { id }, data });
    }

    async findMany(params: {
        where?: Prisma.CommissionWhereInput;
        orderBy?: Prisma.CommissionOrderByWithRelationInput;
        take?: number;
        skip?: number;
        include?: Prisma.CommissionInclude;
    }): Promise<Commission[]> {
        return prisma.commission.findMany(params);
    }

    async count(where?: Prisma.CommissionWhereInput): Promise<number> {
        return prisma.commission.count({ where });
    }

    // Withdrawal Methods
    async createWithdrawal(data: Prisma.CommissionWithdrawalCreateInput): Promise<CommissionWithdrawal> {
        return prisma.commissionWithdrawal.create({ data });
    }

    async findWithdrawalById(id: string): Promise<CommissionWithdrawal | null> {
        return prisma.commissionWithdrawal.findUnique({ where: { id } });
    }

    async updateWithdrawal(
        id: string,
        data: Prisma.CommissionWithdrawalUpdateInput
    ): Promise<CommissionWithdrawal> {
        return prisma.commissionWithdrawal.update({ where: { id }, data });
    }

    async findWithdrawals(params: {
        where?: Prisma.CommissionWithdrawalWhereInput;
        orderBy?: Prisma.CommissionWithdrawalOrderByWithRelationInput;
        take?: number;
        skip?: number;
        include?: Prisma.CommissionWithdrawalInclude;
    }): Promise<CommissionWithdrawal[]> {
        return prisma.commissionWithdrawal.findMany(params);
    }

    async countWithdrawals(where?: Prisma.CommissionWithdrawalWhereInput): Promise<number> {
        return prisma.commissionWithdrawal.count({ where });
    }

    async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return prisma.$transaction(fn);
    }
}
