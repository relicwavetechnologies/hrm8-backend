"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionalSalesController = void 0;
const controller_1 = require("../../core/controller");
const regional_sales_service_1 = require("./regional-sales.service");
const regional_sales_repository_1 = require("./regional-sales.repository");
class RegionalSalesController extends controller_1.BaseController {
    constructor() {
        super();
        this.getLeads = async (req, res) => {
            try {
                const { regionId, status, assignedTo } = req.query;
                const result = await this.regionalSalesService.getLeads(regionId, req.assignedRegionIds, { status: status, assignedTo: assignedTo });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getOpportunities = async (req, res) => {
            try {
                const { regionId, stage, salesAgentId } = req.query;
                const result = await this.regionalSalesService.getOpportunities(regionId, req.assignedRegionIds, { stage: stage, salesAgentId: salesAgentId });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStats = async (req, res) => {
            try {
                const { regionId } = req.query;
                const result = await this.regionalSalesService.getStats(regionId, req.assignedRegionIds);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getActivities = async (req, res) => {
            try {
                const { regionId } = req.query;
                const result = await this.regionalSalesService.getActivities(regionId, req.assignedRegionIds);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.reassignLead = async (req, res) => {
            try {
                const { leadId } = req.params;
                const { newConsultantId } = req.body;
                const result = await this.regionalSalesService.reassignLead(leadId, newConsultantId, {
                    id: req.hrm8User?.id || 'system',
                    email: req.hrm8User?.email || 'unknown',
                    role: req.hrm8User?.role || 'UNKNOWN'
                }, req.assignedRegionIds, {
                    ip: req.ip,
                    userAgent: req.get('user-agent') || undefined
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.regionalSalesService = new regional_sales_service_1.RegionalSalesService(new regional_sales_repository_1.RegionalSalesRepository());
    }
}
exports.RegionalSalesController = RegionalSalesController;
