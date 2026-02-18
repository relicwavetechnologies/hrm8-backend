"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingController = void 0;
const controller_1 = require("../../core/controller");
const pricing_service_1 = require("./pricing.service");
const pricing_repository_1 = require("./pricing.repository");
const http_exception_1 = require("../../core/http-exception");
const prisma_1 = require("../../utils/prisma");
class PricingController extends controller_1.BaseController {
    constructor() {
        super();
        // Products
        this.getProducts = async (req, res) => {
            try {
                const result = await this.pricingService.getProducts();
                return this.sendSuccess(res, { products: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.upsertProduct = async (req, res) => {
            try {
                const result = await this.pricingService.upsertProduct(req.body);
                return this.sendSuccess(res, { product: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteProduct = async (req, res) => {
            try {
                const { id } = req.params;
                await this.pricingService.deleteProduct(id);
                return this.sendSuccess(res, { message: 'Product deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Price Books
        this.getPriceBooks = async (req, res) => {
            try {
                const { regionId } = req.query;
                const result = await this.pricingService.getPriceBooks(regionId, req.assignedRegionIds);
                return this.sendSuccess(res, { priceBooks: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createPriceBook = async (req, res) => {
            try {
                const payload = { ...req.body };
                const role = req.hrm8User?.role;
                const requestedIsGlobal = Boolean(payload.isGlobal ?? payload.is_global ?? false);
                let requestedRegionId = (payload.regionId ?? payload.region_id);
                if (role === 'REGIONAL_LICENSEE') {
                    const assignedRegionIds = req.assignedRegionIds || [];
                    if (!assignedRegionIds.length) {
                        throw new http_exception_1.HttpException(403, 'Regional admin has no assigned region');
                    }
                    if (requestedIsGlobal) {
                        throw new http_exception_1.HttpException(403, 'Regional admin cannot create global price books');
                    }
                    if (requestedRegionId && !assignedRegionIds.includes(requestedRegionId)) {
                        throw new http_exception_1.HttpException(403, 'Region is outside your assigned scope');
                    }
                    requestedRegionId = requestedRegionId || assignedRegionIds[0];
                    payload.isGlobal = false;
                    payload.is_global = false;
                    payload.regionId = requestedRegionId;
                    payload.region_id = requestedRegionId;
                }
                const result = await this.pricingService.createPriceBook(payload);
                return this.sendSuccess(res, { priceBook: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updatePriceBook = async (req, res) => {
            try {
                const { id } = req.params;
                const existing = await this.pricingService.getPriceBook(id);
                if (!existing) {
                    throw new http_exception_1.HttpException(404, 'Price book not found');
                }
                const payload = { ...req.body };
                const role = req.hrm8User?.role;
                if (role === 'REGIONAL_LICENSEE') {
                    this.ensureRegionalPriceBookAccess(req, {
                        is_global: existing.is_global,
                        region_id: existing.region_id,
                    });
                    const assignedRegionIds = req.assignedRegionIds || [];
                    const requestedIsGlobal = payload.isGlobal ?? payload.is_global ?? existing.is_global;
                    if (requestedIsGlobal) {
                        throw new http_exception_1.HttpException(403, 'Regional admin cannot convert to global price book');
                    }
                    const requestedRegionId = (payload.regionId ?? payload.region_id ?? existing.region_id);
                    if (!requestedRegionId || !assignedRegionIds.includes(requestedRegionId)) {
                        throw new http_exception_1.HttpException(403, 'Region is outside your assigned scope');
                    }
                    payload.isGlobal = false;
                    payload.is_global = false;
                    payload.regionId = requestedRegionId;
                    payload.region_id = requestedRegionId;
                }
                const result = await this.pricingService.updatePriceBook(id, payload);
                return this.sendSuccess(res, { priceBook: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deletePriceBook = async (req, res) => {
            try {
                const { id } = req.params;
                const existing = await this.pricingService.getPriceBook(id);
                if (!existing) {
                    throw new http_exception_1.HttpException(404, 'Price book not found');
                }
                this.ensureRegionalPriceBookAccess(req, {
                    is_global: existing.is_global,
                    region_id: existing.region_id,
                });
                await this.pricingService.deletePriceBook(id);
                return this.sendSuccess(res, { message: 'Price book deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Price Tiers
        this.createTier = async (req, res) => {
            try {
                const { priceBookId } = req.params;
                const priceBook = await this.pricingService.getPriceBook(priceBookId);
                if (!priceBook) {
                    throw new http_exception_1.HttpException(404, 'Price book not found');
                }
                this.ensureRegionalPriceBookAccess(req, {
                    is_global: priceBook.is_global,
                    region_id: priceBook.region_id,
                });
                const result = await this.pricingService.createTier(priceBookId, req.body);
                return this.sendSuccess(res, { tier: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateTier = async (req, res) => {
            try {
                const { id } = req.params;
                const tier = await prisma_1.prisma.priceTier.findUnique({
                    where: { id: id },
                    select: {
                        price_book: {
                            select: { is_global: true, region_id: true }
                        }
                    }
                });
                if (!tier?.price_book) {
                    throw new http_exception_1.HttpException(404, 'Price tier not found');
                }
                this.ensureRegionalPriceBookAccess(req, {
                    is_global: tier.price_book.is_global,
                    region_id: tier.price_book.region_id,
                });
                const result = await this.pricingService.updateTier(id, req.body);
                return this.sendSuccess(res, { tier: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteTier = async (req, res) => {
            try {
                const { id } = req.params;
                const tier = await prisma_1.prisma.priceTier.findUnique({
                    where: { id: id },
                    select: {
                        price_book: {
                            select: { is_global: true, region_id: true }
                        }
                    }
                });
                if (!tier?.price_book) {
                    throw new http_exception_1.HttpException(404, 'Price tier not found');
                }
                this.ensureRegionalPriceBookAccess(req, {
                    is_global: tier.price_book.is_global,
                    region_id: tier.price_book.region_id,
                });
                await this.pricingService.deleteTier(id);
                return this.sendSuccess(res, { message: 'Tier deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Promo Codes
        this.getPromoCodes = async (req, res) => {
            try {
                const result = await this.pricingService.getPromoCodes();
                return this.sendSuccess(res, { promoCodes: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createPromoCode = async (req, res) => {
            try {
                if (req.hrm8User?.role !== 'GLOBAL_ADMIN') {
                    throw new http_exception_1.HttpException(403, 'Only global admins can create promo codes');
                }
                const result = await this.pricingService.createPromoCode(req.body);
                return this.sendSuccess(res, { promoCode: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updatePromoCode = async (req, res) => {
            try {
                if (req.hrm8User?.role !== 'GLOBAL_ADMIN') {
                    throw new http_exception_1.HttpException(403, 'Only global admins can update promo codes');
                }
                const { id } = req.params;
                const result = await this.pricingService.updatePromoCode(id, req.body);
                return this.sendSuccess(res, { promoCode: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deletePromoCode = async (req, res) => {
            try {
                if (req.hrm8User?.role !== 'GLOBAL_ADMIN') {
                    throw new http_exception_1.HttpException(403, 'Only global admins can delete promo codes');
                }
                const { id } = req.params;
                await this.pricingService.deletePromoCode(id);
                return this.sendSuccess(res, { message: 'Promo code deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.validatePromoCode = async (req, res) => {
            try {
                const { code } = req.body;
                const result = await this.pricingService.validatePromoCode(code);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.pricingService = new pricing_service_1.PricingService(new pricing_repository_1.PricingRepository());
    }
    ensureRegionalPriceBookAccess(req, priceBook) {
        const role = req.hrm8User?.role;
        if (role === 'GLOBAL_ADMIN')
            return;
        if (role !== 'REGIONAL_LICENSEE') {
            throw new http_exception_1.HttpException(403, 'Unauthorized pricing access');
        }
        const assignedRegionIds = req.assignedRegionIds || [];
        if (!assignedRegionIds.length) {
            throw new http_exception_1.HttpException(403, 'Regional admin has no assigned region');
        }
        if (priceBook.is_global) {
            throw new http_exception_1.HttpException(403, 'Regional admin cannot manage global price books');
        }
        if (!priceBook.region_id || !assignedRegionIds.includes(priceBook.region_id)) {
            throw new http_exception_1.HttpException(403, 'Price book is outside your assigned region scope');
        }
    }
}
exports.PricingController = PricingController;
