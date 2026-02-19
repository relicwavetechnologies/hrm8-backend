"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverviewController = void 0;
const controller_1 = require("../../core/controller");
const overview_repository_1 = require("./overview.repository");
const overview_service_1 = require("./overview.service");
class OverviewController extends controller_1.BaseController {
    constructor() {
        super();
        this.getOverview = async (req, res) => {
            try {
                const role = req.hrm8User?.role || '';
                const regionId = req.query.regionId || 'all';
                const period = req.query.period;
                const summaryOnly = req.query.summaryOnly === '1' || req.query.summaryOnly === 'true';
                const data = await this.overviewService.getOverview({
                    role,
                    requestedRegionId: regionId,
                    assignedRegionIds: req.assignedRegionIds,
                    period,
                    summaryOnly
                });
                return this.sendSuccess(res, data);
            }
            catch (error) {
                const status = typeof error?.statusCode === 'number' ? error.statusCode : 400;
                return this.sendError(res, error, status);
            }
        };
        this.overviewService = new overview_service_1.OverviewService(new overview_repository_1.OverviewRepository());
    }
}
exports.OverviewController = OverviewController;
