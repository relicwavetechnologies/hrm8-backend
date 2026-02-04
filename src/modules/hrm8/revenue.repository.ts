import { prisma } from '../../utils/prisma';
import { Prisma, RevenueStatus } from '@prisma/client';

export class RevenueRepository {
    async findMany(filters: {
        regionId?: string;
        regionIds?: string[];
        licenseeId?: string;
        status?: RevenueStatus;
    }) {
        const where: any = {};
        if (filters.regionId) where.region_id = filters.regionId;
        if (filters.regionIds) where.region_id = { in: filters.regionIds };
        if (filters.licenseeId) where.licensee_id = filters.licenseeId;
        if (filters.status) where.status = filters.status;

        return prisma.regionalRevenue.findMany({
            where,
            include: {
                region: true,
                licensee: true
            },
            orderBy: { period_start: 'desc' }
        });
    }

    async findById(id: string) {
        return prisma.regionalRevenue.findUnique({
            where: { id },
            include: { region: true, licensee: true }
        });
    }

    async update(id: string, data: any) {
        return prisma.regionalRevenue.update({ where: { id }, data });
    }

    async getCompanyRevenueBreakdown(regionIds?: string[]) {
        const billWhere: any = { status: 'PAID' };
        if (regionIds && regionIds.length > 0) {
            billWhere.region_id = { in: regionIds };
        }

        const bills = await prisma.bill.findMany({
            where: billWhere,
            include: {
                company: {
                    include: {
                        region: {
                            include: { licensee: true }
                        },
                        jobs: {
                            where: { status: { in: ['OPEN', 'ON_HOLD'] } },
                            select: { id: true }
                        }
                    }
                }
            }
        });

        const map: Record<string, any> = {};

        bills.forEach((bill) => {
            const company = bill.company;
            if (!company) return;
            const companyId = company.id;
            if (!map[companyId]) {
                map[companyId] = {
                    id: companyId,
                    name: company.name,
                    region_id: company.region_id,
                    job_revenue: 0,
                    subscription_revenue: 0,
                    total_revenue: 0,
                    licensee_share: 0,
                    hrm8_share: 0,
                    active_jobs: company.jobs?.length || 0,
                    last_payment_at: bill.paid_at,
                };
            }

            const totalAmount = Number(bill.total_amount || 0);
            map[companyId].total_revenue += totalAmount;

            const lineItems = Array.isArray(bill.line_items) ? bill.line_items : [];
            if (lineItems.length === 0) {
                map[companyId].subscription_revenue += totalAmount;
            } else {
                lineItems.forEach((item: any) => {
                    const label = String(item.type || item.category || item.name || '').toLowerCase();
                    const amount = Number(item.amount || item.unit_price || 0);
                    if (label.includes('job') || label.includes('posting')) {
                        map[companyId].job_revenue += amount;
                    } else if (label.includes('subscription') || label.includes('plan')) {
                        map[companyId].subscription_revenue += amount;
                    } else {
                        map[companyId].subscription_revenue += amount;
                    }
                });
            }

            if (bill.paid_at && (!map[companyId].last_payment_at || bill.paid_at > map[companyId].last_payment_at)) {
                map[companyId].last_payment_at = bill.paid_at;
            }
        });

        return Object.values(map).map((entry: any) => {
            const companyRegion = bills.find((b) => b.company?.id === entry.id)?.company?.region;
            const licenseePercent = companyRegion?.licensee?.revenue_share_percent || 0;
            entry.licensee_share = (entry.total_revenue * licenseePercent) / 100;
            entry.hrm8_share = entry.total_revenue - entry.licensee_share;
            return entry;
        });
    }

    async findPaidBills(where: any) {
        return prisma.bill.findMany({
            where,
            select: {
                id: true,
                region_id: true,
                total_amount: true,
                paid_at: true,
                created_at: true,
            }
        });
    }

    async findPaidCommissions(where: any) {
        return prisma.commission.findMany({
            where,
            select: {
                id: true,
                consultant_id: true,
                region_id: true,
                amount: true,
                type: true,
                paid_at: true,
                created_at: true,
            }
        });
    }

    async findRegions(regionIds?: string[]) {
        return prisma.region.findMany({
            where: regionIds && regionIds.length > 0 ? { id: { in: regionIds } } : {},
            select: { id: true, name: true }
        });
    }

    async findConsultants(regionIds?: string[]) {
        return prisma.consultant.findMany({
            where: regionIds && regionIds.length > 0 ? { region_id: { in: regionIds } } : {},
            select: { id: true, first_name: true, last_name: true, region_id: true }
        });
    }
}
