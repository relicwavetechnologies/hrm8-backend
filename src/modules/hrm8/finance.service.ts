import { BaseService } from '../../core/service';
import { FinanceRepository } from './finance.repository';
import { HttpException } from '../../core/http-exception';

export class FinanceService extends BaseService {
    constructor(private financeRepository: FinanceRepository) {
        super();
    }

    // --- Commissions ---
    async getAllCommissions(filters: any) {
        return this.financeRepository.findAllCommissions(filters);
    }

    async confirmCommission(id: string) {
        const comm = await this.financeRepository.findCommissionById(id);
        if (!comm) throw new HttpException(404, 'Commission not found');
        return this.financeRepository.updateCommission(id, { status: 'CONFIRMED', confirmed_at: new Date() });
    }

    async markCommissionPaid(id: string) {
        const comm = await this.financeRepository.findCommissionById(id);
        if (!comm) throw new HttpException(404, 'Commission not found');
        return this.financeRepository.updateCommission(id, { status: 'PAID', paid_at: new Date() });
    }

    // --- Revenue ---
    async getRevenueStats() {
        const regions = await this.financeRepository.getRegionalRevenue();
        // Transform data for dashboard
        return regions.map(r => ({
            region: r.name,
            // Fixed type error: bills -> bill
            revenue: r.companies.reduce((sum: number, c: any) => sum + c.bill.reduce((bSum: number, b: any) => bSum + b.amount, 0), 0)
        }));
    }

    // --- Invoices ---
    async getInvoices() {
        return this.financeRepository.findInvoices({});
    }

    async calculateSettlement(data: { licenseeId: string, periodStart: string, periodEnd: string }) {
        const start = new Date(data.periodStart);
        const end = new Date(data.periodEnd);

        // Find bills paid in this period for the licensee's region
        // We need to fetch licensee region first. For now assuming passed regionId or derivation
        // Ideally we fetch the licensee and get their region_id
        // Since we don't have LicenseeService injected, we rely on repository query

        // This logic simulates fetching revenue. 
        // In real impl, we'd fetch actual Paid Bills sum for the Region linked to Licensee
        // Since we lack direct Bill->Licensee link, we assume Licensee->Region->Bill

        return {
            periodStart: start,
            periodEnd: end,
            totalRevenue: 15000,
            licenseeShare: 3000,
            hrm8Share: 12000,
            billCount: 45
        };
    }

    // --- Settlements ---
    async getSettlements(filters: any) {
        return this.financeRepository.findSettlements(filters);
    }

    async getSettlementById(id: string) {
        return this.financeRepository.findSettlementById(id);
    }

    async updateSettlement(id: string, data: any) {
        return this.financeRepository.updateSettlement(id, data);
    }

    async getSettlementStats() {
        return this.financeRepository.getSettlementStats();
    }

    async generateSettlement(licenseeId: string, periodEnd: Date) {
        const start = new Date(periodEnd);
        start.setMonth(start.getMonth() - 1); // Default to monthly

        // Logic: Calculate revenue (mocked for now as 10k)
        const totalRevenue = 10000;
        const licenseeShare = totalRevenue * 0.2; // 20%
        const hrm8Share = totalRevenue - licenseeShare;

        return this.financeRepository.createSettlement({
            licensee: { connect: { id: licenseeId } },
            period_start: start,
            period_end: periodEnd,
            total_revenue: totalRevenue,
            licensee_share: licenseeShare,
            hrm8_share: hrm8Share,
            status: 'PENDING'
        });
    }

    async generateAllPendingSettlements(periodEnd: Date) {
        // Logic to find all active licensees and generate settlements
        // Simplified for this iteration
        return {
            generated: 0,
            errors: []
        };
    }

    async markSettlementPaid(id: string, reference: string) {
        const settlement = await this.financeRepository.findSettlementById(id);
        if (!settlement) throw new HttpException(404, 'Settlement not found');
        return this.financeRepository.updateSettlement(id, { status: 'PAID', payment_date: new Date(), reference });
    }

    // --- Detailed Revenue ---
    async getRevenueByRegion(regionId: string, filters: any) {
        // Fetch paid bills for region
        return this.financeRepository.findInvoices({
            region_id: regionId,
            status: 'PAID',
            ...filters
        });
    }

    async calculateMonthlyRevenue(regionId: string, month: Date) {
        const start = new Date(month.getFullYear(), month.getMonth(), 1);
        const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        const invoices = await this.financeRepository.findInvoices({
            region_id: regionId,
            status: 'PAID',
            created_at: { gte: start, lte: end }
        });

        const total = invoices.reduce((sum: number, inv: any) => sum + inv.total_amount, 0);
        return { total, breakdown: invoices };
    }

    async processAllRegionsForMonth(month: Date) {
        const regions = await this.financeRepository.findAllRegions();
        const results = { processed: 0, errors: [] as any[] };

        for (const region of regions) {
            try {
                // Assuming region leader is licensee
                // This logic implies 1:1 Licensee-Region mapping or derivation
                // Since we don't have Licensee model in standard sense, we skip if no licensee linked
                // or assume we generate for the region itself (conceptually)

                // For now, we simulate finding licensee by region info if possible
                // If not, we skip.
                // In real app, we'd lookup Licensee for Region.

                // Let's assume we just calculate generic settlement stats for the region
                await this.calculateMonthlyRevenue(region.id, month);
                results.processed++;
            } catch (err) {
                results.errors.push({ regionId: region.id, error: err });
            }
        }
        return results;
    }
}
