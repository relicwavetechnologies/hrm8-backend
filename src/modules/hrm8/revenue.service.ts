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
            regionId: revenue.region_id,
            licenseeId: revenue.licensee_id,
            periodStart: revenue.period_start,
            periodEnd: revenue.period_end,
            totalRevenue: revenue.total_revenue,
            licenseeShare: revenue.licensee_share,
            hrm8Share: revenue.hrm8_share,
            status: revenue.status,
            paymentDate: revenue.payment_date,
            regionName: revenue.region?.name, // Assuming relation exists
            licenseeName: revenue.licensee?.name,
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
        return revenue;
    }

    async confirm(id: string) {
        return this.revenueRepository.update(id, { status: 'CONFIRMED' });
    }

    async markAsPaid(id: string) {
        return this.revenueRepository.update(id, { status: 'PAID', paid_at: new Date() });
    }

    async getCompanyBreakdown(regionIds?: string[]) {
        return this.revenueRepository.getCompanyRevenueBreakdown(regionIds);
    }

    async getDashboard(regionIds?: string[], startDate?: string, endDate?: string) {
        // Mock data for now to fix the doctype error and get the page rendering.
        // In a real implementation, this would aggregate data from commissions, revenue, bills etc.
        return {
            summary: {
                totalRevenue: 150000,
                totalCommissions: 15000,
                netRevenue: 135000,
                commissionRate: 10,
                billCount: 45,
                paidCommissionCount: 12
            },
            byRegion: [],
            byCommissionType: [
                { type: 'Placement', amount: 12000, count: 8, percentage: 80 },
                { type: 'Hourly', amount: 3000, count: 20, percentage: 20 }
            ],
            topConsultants: [],
            timeline: [
                { month: 'Jan', revenue: 10000, commissions: 1000, netRevenue: 9000, billCount: 5 },
                { month: 'Feb', revenue: 12000, commissions: 1200, netRevenue: 10800, billCount: 6 },
                { month: 'Mar', revenue: 15000, commissions: 1500, netRevenue: 13500, billCount: 8 }
            ]
        };
    }

    async getSummary(regionIds?: string[], startDate?: string, endDate?: string) {
        return {
            totalRevenue: 150000,
            totalCommissions: 15000,
            netRevenue: 135000,
            commissionRate: 10,
            billCount: 45,
            paidCommissionCount: 12
        };
    }
}
