"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutsController = void 0;
const controller_1 = require("../../core/controller");
const payouts_service_1 = require("./payouts.service");
class PayoutsController extends controller_1.BaseController {
    constructor() {
        super('payouts');
        this.service = new payouts_service_1.PayoutsService();
        this.createBeneficiary = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.service.createBeneficiary(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStatus = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.service.getStatus(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getLoginLink = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await this.service.getLoginLink(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.executeWithdrawal = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const withdrawalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const result = await this.service.executeWithdrawal(withdrawalId, consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.PayoutsController = PayoutsController;
