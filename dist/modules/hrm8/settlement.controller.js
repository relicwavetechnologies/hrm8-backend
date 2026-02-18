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
                const { payment_date, payment_reference } = req.body;
                const paymentDate = payment_date;
                const paymentReference = payment_reference;
                let dateObj = new Date(paymentDate);
                // Handle DD/MM/YYYY format if new Date() fails or returns Invalid Date
                if (isNaN(dateObj.getTime()) && typeof paymentDate === 'string' && paymentDate.includes('/')) {
                    const parts = paymentDate.split('/');
                    if (parts.length === 3) {
                        // Assume DD/MM/YYYY
                        const [day, month, year] = parts;
                        // Note: Month is 0-indexed in Date constructor if numbers, but 1-indexed in string 'YYYY-MM-DD'
                        dateObj = new Date(`${year}-${month}-${day}`);
                    }
                }
                if (isNaN(dateObj.getTime())) {
                    return this.sendError(res, new Error('Invalid payment date format'));
                }
                const result = await this.settlementService.markAsPaid(id, {
                    paymentDate: dateObj,
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
