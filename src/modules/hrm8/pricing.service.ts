import { BaseService } from '../../core/service';
import { PricingRepository } from './pricing.repository';

export class PricingService extends BaseService {
    constructor(private pricingRepository: PricingRepository) {
        super();
    }

    async getProducts() {
        return this.pricingRepository.findAllProducts();
    }

    async getPriceBooks(regionId?: string, regionIds?: string[]) {
        return this.pricingRepository.findAllPriceBooks({ regionId, regionIds });
    }
}
