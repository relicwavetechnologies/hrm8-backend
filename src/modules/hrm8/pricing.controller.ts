import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { PricingService } from './pricing.service';
import { PricingRepository } from './pricing.repository';
import { Hrm8AuthenticatedRequest } from '../../types';

export class PricingController extends BaseController {
    private pricingService: PricingService;

    constructor() {
        super();
        this.pricingService = new PricingService(new PricingRepository());
    }

    getProducts = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.pricingService.getProducts();
            return this.sendSuccess(res, { products: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getPriceBooks = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.query;
            const result = await this.pricingService.getPriceBooks(
                regionId as string,
                req.assignedRegionIds
            );
            return this.sendSuccess(res, { priceBooks: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
