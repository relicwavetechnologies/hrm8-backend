import { BaseRepository } from '../../core/repository';
import { Prisma } from '@prisma/client';

export class FinanceRepository extends BaseRepository {

    // --- Commissions ---
    async findAllCommissions(filters: any) {
        return this.prisma.commission.findMany({
            where: filters,
            orderBy: { created_at: 'desc' },
            include: {
                consultant: { select: { id: true, first_name: true, last_name: true } },
                job: { select: { id: true, title: true } }
            }
        });
    }

    async findCommissionById(id: string) {
        return this.prisma.commission.findUnique({
            where: { id },
            include: {
                consultant: true,
                job: true
            }
        });
    }

    async updateCommission(id: string, data: Prisma.CommissionUpdateInput) {
        return this.prisma.commission.update({ where: { id }, data });
    }

    // --- Revenue ---
    async getRegionalRevenue() {
        // Aggregate revenue by region
        return this.prisma.region.findMany({
            select: {
                id: true,
                name: true,
                companies: {
                    select: { bill: { where: { status: 'PAID' }, select: { amount: true } } }
                }
            }
        });
    }



    // --- Pricing ---
    async findPriceBooks() {
        return this.prisma.priceBook.findMany();
    }

    async createPriceBook(data: Prisma.PriceBookCreateInput) {
        return this.prisma.priceBook.create({ data });
    }

    async findInvoices(filters: any) {
        return this.prisma.bill.findMany({
            where: filters,
            include: { company: { select: { name: true } } },
            orderBy: { created_at: 'desc' }
        });
    }

    // --- Settlements ---
    async findSettlements(filters: any) {
        const where: any = {};
        if (filters.licenseeId) where.licensee_id = filters.licenseeId;
        if (filters.status) where.status = filters.status;

        // Using `any` for prisma here because some models might differ, assuming Settlement model exists from previous context
        // If Settlement model missing, we might need to use generic query or fix schema. 
        // Based on schema view earlier, Settlement model DOES exist.
        return this.prisma.settlement.findMany({
            where,
            include: { licensee: true },
            orderBy: { period_end: 'desc' },
            take: filters.limit ? Number(filters.limit) : undefined
        });
    }

    async findSettlementById(id: string) {
        return this.prisma.settlement.findUnique({
            where: { id },
            include: { licensee: true }
        });
    }

    async getSettlementStats() {
        const [total, pending, paid] = await Promise.all([
            this.prisma.settlement.count(),
            this.prisma.settlement.count({ where: { status: 'PENDING' } }),
            this.prisma.settlement.count({ where: { status: 'PAID' } })
        ]);
        return { total, pending, paid };
    }

    async updateSettlement(id: string, data: any) {
        return this.prisma.settlement.update({
            where: { id },
            data
        });
    }

    async createSettlement(data: Prisma.SettlementCreateInput) {
        return this.prisma.settlement.create({ data });
    }

    async findAllRegions() {
        return this.prisma.region.findMany();
    }
}
