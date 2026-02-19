"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const controller_1 = require("../../core/controller");
const analytics_service_1 = require("./analytics.service");
const analytics_repository_1 = require("./analytics.repository");
class AnalyticsController extends controller_1.BaseController {
    constructor() {
        super();
        this.getOperationalStats = async (req, res) => {
            try {
                const { regionId } = req.params;
                const result = await this.analyticsService.getOperationalStats(regionId, req.assignedRegionIds);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getRegionalCompanies = async (req, res) => {
            try {
                const { regionId } = req.params;
                const { status } = req.query;
                const result = await this.analyticsService.getRegionalCompanies(regionId, status, req.assignedRegionIds);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getPlatformOverview = async (req, res) => {
            try {
                const { startDate, endDate, companyId, regionId } = req.query;
                const result = await this.analyticsService.getPlatformOverview({
                    startDate: startDate,
                    endDate: endDate,
                    companyId: companyId,
                    regionId: regionId,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getPlatformTrends = async (req, res) => {
            try {
                const { period, companyId, regionId } = req.query;
                const result = await this.analyticsService.getPlatformTrends(period, {
                    companyId: companyId,
                    regionId: regionId,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getTopCompanies = async (req, res) => {
            try {
                const { limit, regionId } = req.query;
                const result = await this.analyticsService.getTopPerformingCompanies(limit ? parseInt(limit, 10) : 10, regionId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobBoardStats = async (req, res) => {
            try {
                const region = req.query.region;
                const page = req.query.page ? parseInt(req.query.page, 10) : 1;
                const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
                const result = await this.analyticsService.getJobBoardStats({
                    regionId: region,
                    assignedRegionIds: req.assignedRegionIds,
                    page: Number.isFinite(page) && page > 0 ? page : 1,
                    limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.analyticsService = new analytics_service_1.AnalyticsService(new analytics_repository_1.AnalyticsRepository());
    }
}
exports.AnalyticsController = AnalyticsController;
