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

    async calculateSettlement(data: any) {
        // Complex logic stub
        return { amount: 1000, breakdown: [] };
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
        // Logic to generate settlement
        // Mock implementation for now
        return {
            success: true,
            settlement: { id: 'mock-settlement', licenseeId, amount: 5000, status: 'PENDING' },
            revenueRecordsIncluded: 15
        };
    }

    async generateAllPendingSettlements(periodEnd: Date) {
        // Mock implementation
        return {
            generated: 5,
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
        // This would require a specific repository method, using a stub or generic find for now
        // Assuming we can find by region_id through proper relations or a specific query
        // For now returning mock
        return [];
    }

    async calculateMonthlyRevenue(regionId: string, month: Date) {
        // Stub
        return { total: 10000, breakdown: [] };
    }

    async processAllRegionsForMonth(month: Date) {
        // Stub
        return {
            processed: 10,
            errors: []
        };
    }
}
