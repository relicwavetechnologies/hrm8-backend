import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { PricingService } from './pricing.service';
import { PricingRepository } from './pricing.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';

export class PricingController extends BaseController {
    private pricingService: PricingService;

    constructor() {
        super();
        this.pricingService = new PricingService(new PricingRepository());
    }

    private ensureRegionalPriceBookAccess(
        req: Hrm8AuthenticatedRequest,
        priceBook: { is_global: boolean; region_id: string | null }
    ) {
        const role = req.hrm8User?.role;
        if (role === 'GLOBAL_ADMIN') return;
        if (role !== 'REGIONAL_LICENSEE') {
            throw new HttpException(403, 'Unauthorized pricing access');
        }
        const assignedRegionIds = req.assignedRegionIds || [];
        if (!assignedRegionIds.length) {
            throw new HttpException(403, 'Regional admin has no assigned region');
        }
        if (priceBook.is_global) {
            throw new HttpException(403, 'Regional admin cannot manage global price books');
        }
        if (!priceBook.region_id || !assignedRegionIds.includes(priceBook.region_id)) {
            throw new HttpException(403, 'Price book is outside your assigned region scope');
        }
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
            const payload: any = { ...req.body };
            const role = req.hrm8User?.role;
            const requestedIsGlobal = Boolean(payload.isGlobal ?? payload.is_global ?? false);
            let requestedRegionId = (payload.regionId ?? payload.region_id) as string | undefined;

            if (role === 'REGIONAL_LICENSEE') {
                const assignedRegionIds = req.assignedRegionIds || [];
                if (!assignedRegionIds.length) {
                    throw new HttpException(403, 'Regional admin has no assigned region');
                }
                if (requestedIsGlobal) {
                    throw new HttpException(403, 'Regional admin cannot create global price books');
                }
                if (requestedRegionId && !assignedRegionIds.includes(requestedRegionId)) {
                    throw new HttpException(403, 'Region is outside your assigned scope');
                }
                requestedRegionId = requestedRegionId || assignedRegionIds[0];
                payload.isGlobal = false;
                payload.is_global = false;
                payload.regionId = requestedRegionId;
                payload.region_id = requestedRegionId;
            }

            const result = await this.pricingService.createPriceBook(payload);
            return this.sendSuccess(res, { priceBook: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updatePriceBook = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const existing = await this.pricingService.getPriceBook(id as string);
            if (!existing) {
                throw new HttpException(404, 'Price book not found');
            }

            const payload: any = { ...req.body };
            const role = req.hrm8User?.role;
            if (role === 'REGIONAL_LICENSEE') {
                this.ensureRegionalPriceBookAccess(req, {
                    is_global: existing.is_global,
                    region_id: existing.region_id,
                });

                const assignedRegionIds = req.assignedRegionIds || [];
                const requestedIsGlobal = payload.isGlobal ?? payload.is_global ?? existing.is_global;
                if (requestedIsGlobal) {
                    throw new HttpException(403, 'Regional admin cannot convert to global price book');
                }
                const requestedRegionId = (payload.regionId ?? payload.region_id ?? existing.region_id) as string | null;
                if (!requestedRegionId || !assignedRegionIds.includes(requestedRegionId)) {
                    throw new HttpException(403, 'Region is outside your assigned scope');
                }
                payload.isGlobal = false;
                payload.is_global = false;
                payload.regionId = requestedRegionId;
                payload.region_id = requestedRegionId;
            }

            const result = await this.pricingService.updatePriceBook(id as string, payload);
            return this.sendSuccess(res, { priceBook: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deletePriceBook = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const existing = await this.pricingService.getPriceBook(id as string);
            if (!existing) {
                throw new HttpException(404, 'Price book not found');
            }
            this.ensureRegionalPriceBookAccess(req, {
                is_global: existing.is_global,
                region_id: existing.region_id,
            });
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
            const priceBook = await this.pricingService.getPriceBook(priceBookId as string);
            if (!priceBook) {
                throw new HttpException(404, 'Price book not found');
            }
            this.ensureRegionalPriceBookAccess(req, {
                is_global: priceBook.is_global,
                region_id: priceBook.region_id,
            });
            const result = await this.pricingService.createTier(priceBookId as string, req.body);
            return this.sendSuccess(res, { tier: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateTier = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const tier = await prisma.priceTier.findUnique({
                where: { id: id as string },
                select: {
                    price_book: {
                        select: { is_global: true, region_id: true }
                    }
                }
            });
            if (!tier?.price_book) {
                throw new HttpException(404, 'Price tier not found');
            }
            this.ensureRegionalPriceBookAccess(req, {
                is_global: tier.price_book.is_global,
                region_id: tier.price_book.region_id,
            });
            const result = await this.pricingService.updateTier(id as string, req.body);
            return this.sendSuccess(res, { tier: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteTier = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const tier = await prisma.priceTier.findUnique({
                where: { id: id as string },
                select: {
                    price_book: {
                        select: { is_global: true, region_id: true }
                    }
                }
            });
            if (!tier?.price_book) {
                throw new HttpException(404, 'Price tier not found');
            }
            this.ensureRegionalPriceBookAccess(req, {
                is_global: tier.price_book.is_global,
                region_id: tier.price_book.region_id,
            });
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
            if (req.hrm8User?.role !== 'GLOBAL_ADMIN') {
                throw new HttpException(403, 'Only global admins can create promo codes');
            }
            const result = await this.pricingService.createPromoCode(req.body);
            return this.sendSuccess(res, { promoCode: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updatePromoCode = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            if (req.hrm8User?.role !== 'GLOBAL_ADMIN') {
                throw new HttpException(403, 'Only global admins can update promo codes');
            }
            const { id } = req.params;
            const result = await this.pricingService.updatePromoCode(id as string, req.body);
            return this.sendSuccess(res, { promoCode: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deletePromoCode = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            if (req.hrm8User?.role !== 'GLOBAL_ADMIN') {
                throw new HttpException(403, 'Only global admins can delete promo codes');
            }
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
