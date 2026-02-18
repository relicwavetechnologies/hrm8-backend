"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundController = void 0;
const controller_1 = require("../../core/controller");
const refund_service_1 = require("./refund.service");
const refund_repository_1 = require("./refund.repository");
class RefundController extends controller_1.BaseController {
    constructor() {
        super();
        this.getAll = async (req, res) => {
            try {
                const { status, companyId } = req.query;
                const result = await this.refundService.getAll({
                    status: status,
                    companyId: companyId,
                });
                return this.sendSuccess(res, { refundRequests: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.approve = async (req, res) => {
            try {
                const { id } = req.params;
                const { adminNotes } = req.body;
                const result = await this.refundService.approve(id, req.hrm8User?.id || 'unknown', adminNotes);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.reject = async (req, res) => {
            try {
                const { id } = req.params;
                const { rejectionReason } = req.body;
                const result = await this.refundService.reject(id, req.hrm8User?.id || 'unknown', rejectionReason);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.complete = async (req, res) => {
            try {
                const { id } = req.params;
                const { paymentReference } = req.body;
                const result = await this.refundService.complete(id, paymentReference);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.refundService = new refund_service_1.RefundService(new refund_repository_1.RefundRepository());
    }
}
exports.RefundController = RefundController;
