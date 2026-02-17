"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminBillingController = void 0;
const controller_1 = require("../../core/controller");
const admin_billing_service_1 = require("./admin-billing.service");
const admin_billing_repository_1 = require("./admin-billing.repository");
const http_exception_1 = require("../../core/http-exception");
class AdminBillingController extends controller_1.BaseController {
    constructor() {
        super();
        // --- Commissions ---
        this.getCommissions = async (req, res) => {
            try {
                this.requireAdmin(req);
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const commissions = await this.service.getCommissions(limit, offset);
                return this.sendSuccess(res, { commissions, limit, offset });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getConsultantCommissions = async (req, res) => {
            try {
                this.requireAdmin(req);
                const consultantId = this.getParam(req.params.consultantId);
                const result = await this.service.getConsultantCommissions(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.payCommission = async (req, res) => {
            try {
                this.requireAdmin(req);
                const commissionId = this.getParam(req.params.commissionId);
                const commission = await this.service.payCommission(commissionId);
                return this.sendSuccess(res, { commission });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.bulkPayCommissions = async (req, res) => {
            try {
                this.requireAdmin(req);
                const { commissionIds } = req.body;
                const result = await this.service.bulkPayCommissions(commissionIds);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // --- Revenue ---
        this.getPendingRevenue = async (req, res) => {
            try {
                this.requireAdmin(req);
                const revenue = await this.service.getPendingRevenue();
                return this.sendSuccess(res, { revenue });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getRegionalRevenue = async (req, res) => {
            try {
                this.requireAdmin(req);
                const regionId = this.getParam(req.params.regionId);
                const result = await this.service.getRegionalRevenue(regionId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.calculateMonthlyRevenue = async (req, res) => {
            try {
                this.requireAdmin(req);
                const regionId = this.getParam(req.params.regionId);
                const result = await this.service.calculateMonthlyRevenue(regionId);
                return this.sendSuccess(res, { result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.processAllRegionsRevenue = async (req, res) => {
            try {
                this.requireAdmin(req);
                const result = await this.service.processAllRegionsRevenue();
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // --- Settlements ---
        this.getSettlements = async (req, res) => {
            try {
                this.requireAdmin(req);
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const settlements = await this.service.getSettlements(limit, offset);
                return this.sendSuccess(res, { settlements, limit, offset });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getSettlementById = async (req, res) => {
            try {
                this.requireAdmin(req);
                const settlementId = this.getParam(req.params.settlementId);
                const settlement = await this.service.getSettlementById(settlementId);
                return this.sendSuccess(res, { settlement });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getSettlementStats = async (req, res) => {
            try {
                this.requireAdmin(req);
                const stats = await this.service.getSettlementStats();
                return this.sendSuccess(res, { stats });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.generateSettlement = async (req, res) => {
            try {
                this.requireAdmin(req);
                const licenseeId = this.getParam(req.params.licenseeId);
                const settlement = await this.service.generateSettlement(licenseeId);
                res.status(201);
                return this.sendSuccess(res, { settlement });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.generateAllSettlements = async (req, res) => {
            try {
                this.requireAdmin(req);
                const result = await this.service.generateAllSettlements();
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.markSettlementPaid = async (req, res) => {
            try {
                this.requireAdmin(req);
                const settlementId = this.getParam(req.params.settlementId);
                const settlement = await this.service.markSettlementPaid(settlementId);
                return this.sendSuccess(res, { settlement });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // --- Attribution ---
        this.getAttribution = async (req, res) => {
            try {
                this.requireAdmin(req);
                const companyId = this.getParam(req.params.companyId);
                const attribution = await this.service.getAttribution(companyId);
                return this.sendSuccess(res, { attribution });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getAttributionHistory = async (req, res) => {
            try {
                this.requireAdmin(req);
                const companyId = this.getParam(req.params.companyId);
                const history = await this.service.getAttributionHistory(companyId);
                return this.sendSuccess(res, { history });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.lockAttribution = async (req, res) => {
            try {
                this.requireAdmin(req);
                const companyId = this.getParam(req.params.companyId);
                const attribution = await this.service.lockAttribution(companyId);
                return this.sendSuccess(res, { attribution });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.overrideAttribution = async (req, res) => {
            try {
                this.requireAdmin(req);
                const companyId = this.getParam(req.params.companyId);
                const attribution = await this.service.overrideAttribution(companyId, req.body);
                return this.sendSuccess(res, { attribution });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.service = new admin_billing_service_1.AdminBillingService(new admin_billing_repository_1.AdminBillingRepository());
    }
    requireAdmin(req) {
        if (req.user?.role !== 'SUPER_ADMIN') {
            throw new http_exception_1.HttpException(403, 'Unauthorized: Admin only');
        }
    }
    getParam(value) {
        if (Array.isArray(value))
            return value[0];
        return value || '';
    }
}
exports.AdminBillingController = AdminBillingController;
