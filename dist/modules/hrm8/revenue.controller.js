"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueController = void 0;
const controller_1 = require("../../core/controller");
const revenue_service_1 = require("./revenue.service");
const revenue_repository_1 = require("./revenue.repository");
class RevenueController extends controller_1.BaseController {
    constructor() {
        super();
        this.getAll = async (req, res) => {
            try {
                const regionId = (req.query.regionId || req.query.region_id);
                const licenseeId = (req.query.licenseeId || req.query.licensee_id);
                const status = req.query.status;
                const result = await this.revenueService.getAll({
                    regionId,
                    licenseeId,
                    status,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getById = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.revenueService.getById(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.confirm = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.revenueService.confirm(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.markAsPaid = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.revenueService.markAsPaid(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getCompanyBreakdown = async (req, res) => {
            try {
                const result = await this.revenueService.getCompanyBreakdown(req.assignedRegionIds);
                return this.sendSuccess(res, { companies: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getDashboard = async (req, res) => {
            try {
                const startDate = (req.query.startDate || req.query.start_date);
                const endDate = (req.query.endDate || req.query.end_date);
                const result = await this.revenueService.getDashboard(req.assignedRegionIds, startDate, endDate);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getSummary = async (req, res) => {
            try {
                const startDate = (req.query.startDate || req.query.start_date);
                const endDate = (req.query.endDate || req.query.end_date);
                const result = await this.revenueService.getSummary(req.assignedRegionIds, startDate, endDate);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.revenueService = new revenue_service_1.RevenueService(new revenue_repository_1.RevenueRepository());
    }
}
exports.RevenueController = RevenueController;
