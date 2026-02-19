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
                const result = await this.withdrawalService.getPendingWithdrawals();
                return this.sendSuccess(res, { withdrawals: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.approve = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.withdrawalService.approveWithdrawal(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.reject = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.withdrawalService.rejectWithdrawal(id);
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
                const result = await this.withdrawalService.processPayment(id, notes);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.withdrawalService = new withdrawal_service_1.WithdrawalService();
    }
}
exports.WithdrawalController = WithdrawalController;
