"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionalCompanyController = void 0;
const regional_company_service_1 = require("./regional-company.service");
class RegionalCompanyController {
    constructor() {
        this.getAll = async (req, res, next) => {
            try {
                const { page, limit, search, status } = req.query;
                const result = await this.regionalCompanyService.listCompanies({
                    ...this.getCompanyAccess(req),
                    page: page ? Number(page) : undefined,
                    limit: limit ? Number(limit) : undefined,
                    search,
                    status,
                });
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getById = async (req, res, next) => {
            try {
                const id = this.getParam(req.params.id);
                const result = await this.regionalCompanyService.getById(id, this.getCompanyAccess(req));
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getOverview = async (req, res, next) => {
            try {
                const id = this.getParam(req.params.id);
                const result = await this.regionalCompanyService.getOverview(id, this.getCompanyAccess(req));
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getActivity = async (req, res, next) => {
            try {
                const id = this.getParam(req.params.id);
                const limit = req.query.limit ? Number(req.query.limit) : undefined;
                const result = await this.regionalCompanyService.getActivity(id, {
                    ...this.getCompanyAccess(req),
                    limit,
                });
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getCompanyUsers = async (req, res, next) => {
            try {
                const id = this.getParam(req.params.id);
                const result = await this.regionalCompanyService.getCompanyUsers(id, this.getCompanyAccess(req));
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getPricingContext = async (req, res, next) => {
            try {
                const id = this.getParam(req.params.id);
                const result = await this.regionalCompanyService.getPricingContext(id, this.getCompanyAccess(req));
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getPricingOverrides = async (req, res, next) => {
            try {
                const id = this.getParam(req.params.id);
                const result = await this.regionalCompanyService.getPricingOverrides(id, this.getCompanyAccess(req));
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.createPricingOverride = async (req, res, next) => {
            try {
                const id = this.getParam(req.params.id);
                const actorId = req.hrm8User?.id || 'system';
                const result = await this.regionalCompanyService.createPricingOverride(id, req.body, actorId, this.getCompanyAccess(req));
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.activatePricingOverride = async (req, res, next) => {
            try {
                const companyId = this.getParam(req.params.id);
                const overrideId = this.getParam(req.params.overrideId);
                const actorId = req.hrm8User?.id || 'system';
                const result = await this.regionalCompanyService.activatePricingOverride(companyId, overrideId, actorId, this.getCompanyAccess(req));
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.deactivatePricingOverride = async (req, res, next) => {
            try {
                const companyId = this.getParam(req.params.id);
                const overrideId = this.getParam(req.params.overrideId);
                const actorId = req.hrm8User?.id || 'system';
                const result = await this.regionalCompanyService.deactivatePricingOverride(companyId, overrideId, actorId, this.getCompanyAccess(req));
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getCompanyJobs = async (req, res, next) => {
            try {
                const id = this.getParam(req.params.id);
                const result = await this.regionalCompanyService.getCompanyJobs(id, this.getCompanyAccess(req));
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.regionalCompanyService = new regional_company_service_1.RegionalCompanyService();
    }
    getParam(value) {
        if (Array.isArray(value))
            return value[0];
        return value || '';
    }
    getCompanyAccess(req) {
        return {
            role: req.hrm8User?.role,
            assignedRegionIds: req.assignedRegionIds,
        };
    }
}
exports.RegionalCompanyController = RegionalCompanyController;
