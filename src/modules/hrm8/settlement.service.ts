import { BaseService } from '../../core/service';
import { SettlementRepository } from './settlement.repository';

export class SettlementService extends BaseService {
    constructor(private settlementRepository: SettlementRepository) {
        super();
    }

    private mapToDTO(settlement: any) {
        return {
            id: settlement.id,
            regionId: settlement.region_id,
            licenseeId: settlement.licensee_id,
            periodStart: settlement.period_start,
            periodEnd: settlement.period_end,
            totalRevenue: settlement.total_revenue,
            licenseeShare: settlement.licensee_share,
            currency: settlement.currency,
            status: settlement.status,
            createdAt: settlement.created_at,
            processedAt: settlement.processed_at,
            paidAt: settlement.paid_at,
            paymentReference: settlement.payment_reference,
            licensee: settlement.licensee ? {
                id: settlement.licensee.id,
                name: settlement.licensee.name,
                companyName: settlement.licensee.company_name
            } : undefined
        };
    }

    async getAll(filters: any) {
        const settlements = await this.settlementRepository.findMany(filters);
        return settlements.map((s: any) => this.mapToDTO(s));
    }

    async getStats(filters: any) {
        return this.settlementRepository.getStats(filters);
    }

    async markAsPaid(id: string, data: { paymentDate: Date; paymentReference: string }) {
        return this.settlementRepository.update(id, {
            status: 'PAID',
            paid_at: data.paymentDate,
            payment_reference: data.paymentReference,
        });
    }
}
