"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionController = void 0;
const controller_1 = require("../../core/controller");
const commission_service_1 = require("./commission.service");
const commission_repository_1 = require("./commission.repository");
class CommissionController extends controller_1.BaseController {
    constructor() {
        super();
        this.getAll = async (req, res) => {
            try {
                const { limit, offset, consultantId } = req.query;
                const result = await this.commissionService.getAll({
                    limit: limit ? Number(limit) : undefined,
                    offset: offset ? Number(offset) : undefined,
                    consultantId: consultantId,
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
                const result = await this.commissionService.getById(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.create = async (req, res) => {
            try {
                const result = await this.commissionService.create(req.body);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.confirm = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.commissionService.confirm(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.markAsPaid = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.commissionService.markAsPaid(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.processPayments = async (req, res) => {
            try {
                const { ids } = req.body;
                await this.commissionService.processPayments(ids);
                return this.sendSuccess(res, { message: 'Payments processed successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getRegional = async (req, res) => {
            try {
                // We might need to get region from user or query
                const { regionId } = req.query;
                const result = await this.commissionService.getRegional(regionId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.commissionService = new commission_service_1.CommissionService(new commission_repository_1.CommissionRepository());
    }
}
exports.CommissionController = CommissionController;
