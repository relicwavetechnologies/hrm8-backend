"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingController = void 0;
const controller_1 = require("../../core/controller");
const pricing_service_1 = require("./pricing.service");
const pricing_repository_1 = require("./pricing.repository");
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
                const result = await this.pricingService.createPriceBook(req.body);
                return this.sendSuccess(res, { priceBook: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updatePriceBook = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.pricingService.updatePriceBook(id, req.body);
                return this.sendSuccess(res, { priceBook: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deletePriceBook = async (req, res) => {
            try {
                const { id } = req.params;
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
                const result = await this.pricingService.createPromoCode(req.body);
                return this.sendSuccess(res, { promoCode: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updatePromoCode = async (req, res) => {
            try {
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
}
exports.PricingController = PricingController;
