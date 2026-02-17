"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementController = void 0;
const controller_1 = require("../../core/controller");
const settlement_service_1 = require("./settlement.service");
const settlement_repository_1 = require("./settlement.repository");
class SettlementController extends controller_1.BaseController {
    constructor() {
        super();
        this.getAll = async (req, res) => {
            try {
                const { regionId, status } = req.query;
                const result = await this.settlementService.getAll({
                    regionId: regionId,
                    regionIds: req.assignedRegionIds,
                    status: status,
                });
                return this.sendSuccess(res, { settlements: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStats = async (req, res) => {
            try {
                const { regionId } = req.query;
                const result = await this.settlementService.getStats({
                    regionId: regionId,
                    regionIds: req.assignedRegionIds,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.markAsPaid = async (req, res) => {
            try {
                const id = this.getParam(req.params.id);
                const { paymentDate, paymentReference } = req.body;
                const result = await this.settlementService.markAsPaid(id, {
                    paymentDate: new Date(paymentDate),
                    paymentReference,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.settlementService = new settlement_service_1.SettlementService(new settlement_repository_1.SettlementRepository());
    }
    getParam(value) {
        if (Array.isArray(value))
            return value[0];
        return value || '';
    }
}
exports.SettlementController = SettlementController;
