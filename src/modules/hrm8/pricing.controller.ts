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

    // Products
    getProducts = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.pricingService.getProducts();
            return this.sendSuccess(res, { products: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    upsertProduct = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.pricingService.upsertProduct(req.body);
            return this.sendSuccess(res, { product: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteProduct = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            await this.pricingService.deleteProduct(id as string);
            return this.sendSuccess(res, { message: 'Product deleted successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // Price Books
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

    createPriceBook = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.pricingService.createPriceBook(req.body);
            return this.sendSuccess(res, { priceBook: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updatePriceBook = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.pricingService.updatePriceBook(id as string, req.body);
            return this.sendSuccess(res, { priceBook: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deletePriceBook = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            await this.pricingService.deletePriceBook(id as string);
            return this.sendSuccess(res, { message: 'Price book deleted successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // Price Tiers
    createTier = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { priceBookId } = req.params;
            const result = await this.pricingService.createTier(priceBookId as string, req.body);
            return this.sendSuccess(res, { tier: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateTier = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.pricingService.updateTier(id as string, req.body);
            return this.sendSuccess(res, { tier: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteTier = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            await this.pricingService.deleteTier(id as string);
            return this.sendSuccess(res, { message: 'Tier deleted successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    // Promo Codes
    getPromoCodes = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.pricingService.getPromoCodes();
            return this.sendSuccess(res, { promoCodes: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    createPromoCode = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.pricingService.createPromoCode(req.body);
            return this.sendSuccess(res, { promoCode: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updatePromoCode = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.pricingService.updatePromoCode(id as string, req.body);
            return this.sendSuccess(res, { promoCode: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deletePromoCode = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            await this.pricingService.deletePromoCode(id as string);
            return this.sendSuccess(res, { message: 'Promo code deleted successfully' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    validatePromoCode = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { code } = req.body;
            const result = await this.pricingService.validatePromoCode(code);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
