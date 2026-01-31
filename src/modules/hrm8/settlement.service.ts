import { BaseService } from '../../core/service';
import { SettlementRepository } from './settlement.repository';

export class SettlementService extends BaseService {
    constructor(private settlementRepository: SettlementRepository) {
        super();
    }

    async getAll(filters: any) {
        return this.settlementRepository.findMany(filters);
    }

    async getStats(filters: any) {
        return this.settlementRepository.getStats(filters);
    }
}
