"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const controller_1 = require("../../core/controller");
const billing_service_1 = require("./billing.service");
class BillingController extends controller_1.BaseController {
    constructor() {
        super('billing');
        this.createCheckout = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const result = await billing_service_1.BillingService.createCheckout({
                    companyId: req.user.companyId,
                    userId: req.user.id,
                    userEmail: req.user.email,
                }, req.body || {});
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getPaymentStatus = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const paymentAttemptId = req.params.paymentAttemptId;
                const status = await billing_service_1.BillingService.getPaymentStatus(paymentAttemptId);
                return this.sendSuccess(res, status);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.refundPayment = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const paymentAttemptId = req.params.paymentAttemptId;
                const result = await billing_service_1.BillingService.refundPayment(paymentAttemptId, req.body?.reason);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.handleAirwallexWebhook = async (req, res) => {
            try {
                const signature = req.headers['x-airwallex-signature'] || '';
                const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
                const result = await billing_service_1.BillingService.processWebhook(rawBody, signature, req.body);
                return res.status(200).json({ received: true, ...result });
            }
            catch (error) {
                if (error?.statusCode === 401) {
                    return res.status(401).json({ error: 'Invalid webhook signature' });
                }
                return this.sendError(res, error);
            }
        };
    }
}
exports.BillingController = BillingController;
