import { BaseService } from '../../core/service';
import { RevenueRepository } from './revenue.repository';
import { HttpException } from '../../core/http-exception';
import { RevenueStatus } from '@prisma/client';

export class RevenueService extends BaseService {
    constructor(private revenueRepository: RevenueRepository) {
        super();
    }

    private mapToDTO(revenue: any) {
        return {
            id: revenue.id,
            region_id: revenue.region_id,
            licensee_id: revenue.licensee_id,
            period_start: revenue.period_start,
            period_end: revenue.period_end,
            total_revenue: revenue.total_revenue,
            licensee_share: revenue.licensee_share,
            hrm8_share: revenue.hrm8_share,
            status: revenue.status,
            paid_at: revenue.paid_at,
            created_at: revenue.created_at,
            updated_at: revenue.updated_at,
            region_name: revenue.region?.name,
            licensee_name: revenue.licensee?.name,
        };
    }

    async getAll(filters: any) {
        const revenues = await this.revenueRepository.findMany(filters);
        return {
            revenues: revenues.map(r => this.mapToDTO(r)),
            total: revenues.length
        }
    }

    async getById(id: string) {
        const revenue = await this.revenueRepository.findById(id);
        if (!revenue) throw new HttpException(404, 'Revenue record not found');
        return this.mapToDTO(revenue);
    }

    async confirm(id: string) {
        const updated = await this.revenueRepository.update(id, { status: 'CONFIRMED' });
        return this.mapToDTO(updated);
    }

    async markAsPaid(id: string) {
        const updated = await this.revenueRepository.update(id, { status: 'PAID', paid_at: new Date() });
        return this.mapToDTO(updated);
    }

    async getCompanyBreakdown(regionIds?: string[]) {
        const bills = await this.revenueRepository.getCompanyRevenueBreakdown(regionIds);
        return bills;
    }

    async getDashboard(regionIds?: string[], startDate?: string, endDate?: string) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const billWhere: any = { status: 'PAID' };
        if (start || end) {
            billWhere.paid_at = {};
            if (start) billWhere.paid_at.gte = start;
            if (end) billWhere.paid_at.lte = end;
        }
        if (regionIds && regionIds.length > 0) {
            billWhere.region_id = { in: regionIds };
        }

        const commissionWhere: any = { status: 'PAID' };
        if (start || end) {
            commissionWhere.paid_at = {};
            if (start) commissionWhere.paid_at.gte = start;
            if (end) commissionWhere.paid_at.lte = end;
        }
        if (regionIds && regionIds.length > 0) {
            commissionWhere.region_id = { in: regionIds };
        }

        const [bills, commissions, regions, consultants] = await Promise.all([
            this.revenueRepository.findPaidBills(billWhere),
            this.revenueRepository.findPaidCommissions(commissionWhere),
            this.revenueRepository.findRegions(regionIds),
            this.revenueRepository.findConsultants(regionIds),
        ]);

        const totalRevenue = bills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
        const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const netRevenue = totalRevenue - totalCommissions;
        const commissionRate = totalRevenue > 0 ? (totalCommissions / totalRevenue) * 100 : 0;

        const byRegion = regions.map((region) => {
            const regionBills = bills.filter((b) => b.region_id === region.id);
            const regionCommissions = commissions.filter((c) => c.region_id === region.id);
            const revenue = regionBills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
            const commissionAmount = regionCommissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
            return {
                region_id: region.id,
                region_name: region.name,
                revenue,
                commissions: commissionAmount,
                net_revenue: revenue - commissionAmount,
                bill_count: regionBills.length,
                consultant_count: consultants.filter((c) => c.region_id === region.id).length,
            };
        });

        const commissionTypeTotals: Record<string, { amount: number; count: number }> = {};
        commissions.forEach((c) => {
            const type = c.type || 'UNKNOWN';
            if (!commissionTypeTotals[type]) {
                commissionTypeTotals[type] = { amount: 0, count: 0 };
            }
            commissionTypeTotals[type].amount += Number(c.amount || 0);
            commissionTypeTotals[type].count += 1;
        });

        const byCommissionType = Object.entries(commissionTypeTotals).map(([type, data]) => ({
            type,
            amount: data.amount,
            count: data.count,
            percentage: totalCommissions > 0 ? (data.amount / totalCommissions) * 100 : 0,
        }));

        const consultantTotals: Record<string, { amount: number; count: number }> = {};
        commissions.forEach((c) => {
            if (!c.consultant_id) return;
            if (!consultantTotals[c.consultant_id]) {
                consultantTotals[c.consultant_id] = { amount: 0, count: 0 };
            }
            consultantTotals[c.consultant_id].amount += Number(c.amount || 0);
            consultantTotals[c.consultant_id].count += 1;
        });

        const topConsultants = Object.entries(consultantTotals)
            .map(([consultantId, data]) => {
                const consultant = consultants.find((c) => c.id === consultantId);
                return {
                    consultant_id: consultantId,
                    name: consultant ? `${consultant.first_name} ${consultant.last_name}`.trim() : consultantId,
                    total_commissions: data.amount,
                    commission_count: data.count,
                    region_id: consultant?.region_id || null,
                    region_name: regions.find((r) => r.id === consultant?.region_id)?.name || 'Unknown',
                };
            })
            .sort((a, b) => b.total_commissions - a.total_commissions)
            .slice(0, 10);

        const timelineMap: Record<string, { revenue: number; commissions: number; billCount: number }> = {};
        bills.forEach((b) => {
            const date = b.paid_at || b.created_at;
            if (!date) return;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!timelineMap[key]) timelineMap[key] = { revenue: 0, commissions: 0, billCount: 0 };
            timelineMap[key].revenue += Number(b.total_amount || 0);
            timelineMap[key].billCount += 1;
        });
        commissions.forEach((c) => {
            const date = c.paid_at || c.created_at;
            if (!date) return;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!timelineMap[key]) timelineMap[key] = { revenue: 0, commissions: 0, billCount: 0 };
            timelineMap[key].commissions += Number(c.amount || 0);
        });

        const timeline = Object.entries(timelineMap)
            .map(([month, data]) => ({
                month,
                revenue: data.revenue,
                commissions: data.commissions,
                net_revenue: data.revenue - data.commissions,
                bill_count: data.billCount,
            }))
            .sort((a, b) => (a.month > b.month ? 1 : -1));

        return {
            summary: {
                total_revenue: totalRevenue,
                total_commissions: totalCommissions,
                net_revenue: netRevenue,
                commission_rate: commissionRate,
                bill_count: bills.length,
                paid_commission_count: commissions.length,
            },
            by_region: byRegion,
            by_commission_type: byCommissionType,
            top_consultants: topConsultants,
            timeline,
        };
    }

    async getSummary(regionIds?: string[], startDate?: string, endDate?: string) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const billWhere: any = { status: 'PAID' };
        if (start || end) {
            billWhere.paid_at = {};
            if (start) billWhere.paid_at.gte = start;
            if (end) billWhere.paid_at.lte = end;
        }
        if (regionIds && regionIds.length > 0) {
            billWhere.region_id = { in: regionIds };
        }

        const commissionWhere: any = { status: 'PAID' };
        if (start || end) {
            commissionWhere.paid_at = {};
            if (start) commissionWhere.paid_at.gte = start;
            if (end) commissionWhere.paid_at.lte = end;
        }
        if (regionIds && regionIds.length > 0) {
            commissionWhere.region_id = { in: regionIds };
        }

        const [bills, commissions] = await Promise.all([
            this.revenueRepository.findPaidBills(billWhere),
            this.revenueRepository.findPaidCommissions(commissionWhere),
        ]);

        const totalRevenue = bills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
        const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const netRevenue = totalRevenue - totalCommissions;
        const commissionRate = totalRevenue > 0 ? (totalCommissions / totalRevenue) * 100 : 0;

        return {
            total_revenue: totalRevenue,
            total_commissions: totalCommissions,
            net_revenue: netRevenue,
            commission_rate: commissionRate,
            bill_count: bills.length,
            paid_commission_count: commissions.length,
        };
    }
}
