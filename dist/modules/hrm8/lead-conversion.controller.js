"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadConversionController = void 0;
const controller_1 = require("../../core/controller");
const lead_conversion_service_1 = require("./lead-conversion.service");
const lead_conversion_repository_1 = require("./lead-conversion.repository");
class LeadConversionController extends controller_1.BaseController {
    constructor() {
        super();
        this.getAll = async (req, res) => {
            try {
                const { status } = req.query;
                const result = await this.leadConversionService.getAll({
                    status: status,
                    regionIds: req.assignedRegionIds,
                });
                return this.sendSuccess(res, { requests: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getOne = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.leadConversionService.getOne(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.approve = async (req, res) => {
            try {
                const { id } = req.params;
                const { adminNotes } = req.body;
                const result = await this.leadConversionService.approve(id, {
                    id: req.hrm8User?.id || 'unknown',
                    email: req.hrm8User?.email || 'unknown',
                    role: req.hrm8User?.role || 'UNKNOWN'
                }, adminNotes, {
                    ip: req.ip,
                    userAgent: req.get('user-agent') || undefined
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.decline = async (req, res) => {
            try {
                const { id } = req.params;
                const { declineReason } = req.body;
                const result = await this.leadConversionService.decline(id, {
                    id: req.hrm8User?.id || 'unknown',
                    email: req.hrm8User?.email || 'unknown',
                    role: req.hrm8User?.role || 'UNKNOWN'
                }, declineReason, {
                    ip: req.ip,
                    userAgent: req.get('user-agent') || undefined
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.leadConversionService = new lead_conversion_service_1.LeadConversionService(new lead_conversion_repository_1.LeadConversionRepository());
    }
}
exports.LeadConversionController = LeadConversionController;
