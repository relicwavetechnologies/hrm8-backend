"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalController = void 0;
const controller_1 = require("../../core/controller");
const withdrawal_service_1 = require("./withdrawal.service");
class WithdrawalController extends controller_1.BaseController {
    constructor() {
        super();
        this.getPendingWithdrawals = async (req, res) => {
            try {
                const result = await this.withdrawalService.getPendingWithdrawals(this.getScopedRegionIds(req));
                return this.sendSuccess(res, { withdrawals: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.approve = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.withdrawalService.approveWithdrawal(id, this.getScopedRegionIds(req), req.hrm8User?.id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.reject = async (req, res) => {
            try {
                const { id } = req.params;
                const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
                const result = await this.withdrawalService.rejectWithdrawal(id, this.getScopedRegionIds(req), req.hrm8User?.id, reason);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.processPayment = async (req, res) => {
            try {
                const { id } = req.params;
                const { notes } = req.body;
                const result = await this.withdrawalService.processPayment(id, notes, this.getScopedRegionIds(req), req.hrm8User?.id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.withdrawalService = new withdrawal_service_1.WithdrawalService();
    }
    getScopedRegionIds(req) {
        if (req.hrm8User?.role !== 'REGIONAL_LICENSEE') {
            return undefined;
        }
        return req.assignedRegionIds || [];
    }
}
exports.WithdrawalController = WithdrawalController;
