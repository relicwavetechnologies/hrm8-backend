"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementService = void 0;
const service_1 = require("../../core/service");
class SettlementService extends service_1.BaseService {
    constructor(settlementRepository) {
        super();
        this.settlementRepository = settlementRepository;
    }
    async createSettlement(data) {
        // Generate reference
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const reference = `SET-${dateStr}-${randomSuffix}`;
        return this.settlementRepository.create({
            ...data,
            reference,
            generated_at: new Date()
        });
    }
    mapToDTO(settlement) {
        return {
            id: settlement.id,
            region_id: settlement.region_id,
            licensee_id: settlement.licensee_id,
            period_start: settlement.period_start,
            period_end: settlement.period_end,
            total_revenue: settlement.total_revenue,
            licensee_share: settlement.licensee_share,
            hrm8_share: settlement.hrm8_share,
            currency: settlement.currency,
            status: settlement.status,
            created_at: settlement.created_at,
            processed_at: settlement.processed_at,
            payment_date: settlement.paid_at,
            paid_at: settlement.paid_at,
            payment_reference: settlement.payment_reference,
            licensee: settlement.licensee ? {
                id: settlement.licensee.id,
                name: settlement.licensee.name,
                company_name: settlement.licensee.company_name
            } : undefined
        };
    }
    async getAll(filters) {
        const settlements = await this.settlementRepository.findMany(filters);
        return settlements.map((s) => this.mapToDTO(s));
    }
    async getStats(filters) {
        return this.settlementRepository.getStats(filters);
    }
    async markAsPaid(id, data) {
        return this.settlementRepository.update(id, {
            status: 'PAID',
            paid_at: data.paymentDate,
            payment_reference: data.paymentReference,
        });
    }
}
exports.SettlementService = SettlementService;
