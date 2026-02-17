"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const controller_1 = require("../../core/controller");
const wallet_service_1 = require("./wallet.service");
const subscription_service_1 = require("../subscription/subscription.service");
const http_exception_1 = require("../../core/http-exception");
class WalletController extends controller_1.BaseController {
    constructor() {
        super(...arguments);
        // Account Management
        this.getAccount = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const account = await wallet_service_1.WalletService.getAccount(ownerType, ownerId);
                return this.sendSuccess(res, { account });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.verifyWallet = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const account = await wallet_service_1.WalletService.verifyWallet(ownerType, ownerId);
                return this.sendSuccess(res, { account, verified: true });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getBalance = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const balance = await wallet_service_1.WalletService.getBalance(ownerType, ownerId);
                return this.sendSuccess(res, balance);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Transactions
        this.getTransactions = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const type = req.query.type;
                const result = await wallet_service_1.WalletService.getTransactions(ownerType, ownerId, { limit, offset, type });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Earnings
        this.getEarnings = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const earnings = await wallet_service_1.WalletService.getEarnings(ownerType, ownerId);
                return this.sendSuccess(res, earnings);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Withdrawals
        this.requestWithdrawal = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const { amount, paymentMethod, bankDetails, notes } = req.body;
                if (!amount || !paymentMethod) {
                    throw new http_exception_1.HttpException(400, 'Missing required fields: amount, paymentMethod');
                }
                const withdrawal = await wallet_service_1.WalletService.requestWithdrawal(ownerType, ownerId, {
                    amount,
                    paymentMethod,
                    bankDetails,
                    notes
                });
                return this.sendSuccess(res, { withdrawal });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getWithdrawalHistory = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const status = req.query.status;
                const history = await wallet_service_1.WalletService.getWithdrawalHistory(ownerType, ownerId);
                const withdrawalsList = history.withdrawals;
                const filtered = status ? withdrawalsList.filter(w => w.status === status) : withdrawalsList;
                const paginated = filtered.slice(offset, offset + limit);
                return this.sendSuccess(res, { withdrawals: paginated, total: filtered.length, limit, offset });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Refunds
        this.requestRefund = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const { transactionId, reason, description } = req.body;
                if (!transactionId || !reason) {
                    throw new http_exception_1.HttpException(400, 'Missing required fields: transactionId, reason');
                }
                const refund = await wallet_service_1.WalletService.requestRefund(ownerType, ownerId, {
                    transactionId,
                    reason,
                    description
                });
                return this.sendSuccess(res, { refund });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getRefundHistory = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const history = await wallet_service_1.WalletService.getRefundHistory(ownerType, ownerId);
                const paginated = history.slice(offset, offset + limit);
                return this.sendSuccess(res, { refunds: paginated, total: history.length, limit, offset });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Subscriptions
        this.getSubscriptions = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const subscriptions = await wallet_service_1.WalletService.getSubscriptions(ownerType, ownerId);
                return this.sendSuccess(res, { subscriptions });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getSubscription = async (req, res) => {
            try {
                const { subscriptionId } = req.params;
                const subscription = await wallet_service_1.WalletService.getSubscription(subscriptionId);
                return this.sendSuccess(res, { subscription });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createSubscription = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const body = req.body;
                const planName = body.planName ?? body.name;
                const amount = body.amount ?? body.basePrice;
                const billingCycle = (body.billingCycle || 'MONTHLY');
                if (!planName || amount == null) {
                    throw new http_exception_1.HttpException(400, 'Missing required fields: planName/name and amount/basePrice');
                }
                // Company subscriptions: use SubscriptionService (credits wallet, dynamic regional pricing)
                if (ownerType === 'COMPANY') {
                    const planType = (body.planType || planName).toUpperCase().replace(/-/g, '_');
                    const subscription = await subscription_service_1.SubscriptionService.createSubscription({
                        companyId: ownerId,
                        planType: planType,
                        name: planName,
                        basePrice: amount,
                        billingCycle,
                        jobQuota: body.jobQuota ?? undefined,
                        autoRenew: body.autoRenew ?? true,
                    });
                    return this.sendSuccess(res, {
                        subscription,
                        message: 'Subscription activated. Wallet has been credited.',
                    });
                }
                // Non-company (e.g. consultant): legacy path
                const subscription = await wallet_service_1.WalletService.createSubscription(ownerType, ownerId, {
                    name: planName,
                    amount: Number(amount),
                    billingCycle,
                });
                return this.sendSuccess(res, { subscription });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.renewSubscription = async (req, res) => {
            try {
                const { subscriptionId } = req.params;
                const subscription = await wallet_service_1.WalletService.renewSubscription(subscriptionId);
                return this.sendSuccess(res, { subscription });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.cancelSubscription = async (req, res) => {
            try {
                const { subscriptionId } = req.params;
                const subscription = await wallet_service_1.WalletService.cancelSubscription(subscriptionId);
                return this.sendSuccess(res, { subscription });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Add-ons
        this.purchaseAddonService = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const { addonName, amount, quantity, description } = req.body;
                if (!addonName || !amount) {
                    throw new http_exception_1.HttpException(400, 'Missing required fields: addonName, amount');
                }
                const purchase = await wallet_service_1.WalletService.purchaseAddonService(ownerType, ownerId, {
                    addonName,
                    amount,
                    quantity,
                    description
                });
                return this.sendSuccess(res, { purchase });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Stripe
        this.createStripeCheckoutSession = async (req, res) => {
            try {
                const { ownerType, ownerId } = this.getOwnerInfo(req);
                const { amount, description, successUrl, cancelUrl } = req.body;
                if (!amount || !successUrl || !cancelUrl) {
                    throw new http_exception_1.HttpException(400, 'Missing required fields: amount, successUrl, cancelUrl');
                }
                const session = await wallet_service_1.WalletService.createStripeCheckoutSession(ownerType, ownerId, {
                    amount,
                    description,
                    successUrl,
                    cancelUrl
                });
                return this.sendSuccess(res, { session });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Admin Routes
        this.getPendingWithdrawals = async (req, res) => {
            try {
                if (req.user?.role !== 'SUPER_ADMIN') {
                    throw new http_exception_1.HttpException(403, 'Unauthorized: Admin only');
                }
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const result = await wallet_service_1.WalletService.getPendingWithdrawals();
                const withdrawalsList = result.withdrawals;
                const paginated = withdrawalsList.slice(offset, offset + limit);
                return this.sendSuccess(res, { withdrawals: paginated, total: withdrawalsList.length, limit, offset });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.approveWithdrawal = async (req, res) => {
            try {
                if (req.user?.role !== 'SUPER_ADMIN') {
                    throw new http_exception_1.HttpException(403, 'Unauthorized: Admin only');
                }
                const { withdrawalId } = req.params;
                const withdrawal = await wallet_service_1.WalletService.approveWithdrawal(withdrawalId);
                return this.sendSuccess(res, { withdrawal });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.rejectWithdrawal = async (req, res) => {
            try {
                if (req.user?.role !== 'SUPER_ADMIN') {
                    throw new http_exception_1.HttpException(403, 'Unauthorized: Admin only');
                }
                const { withdrawalId } = req.params;
                const { reason } = req.body;
                if (!reason) {
                    throw new http_exception_1.HttpException(400, 'Reason is required for rejection');
                }
                const withdrawal = await wallet_service_1.WalletService.rejectWithdrawal(withdrawalId, reason);
                return this.sendSuccess(res, { withdrawal });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getWalletStats = async (req, res) => {
            try {
                if (req.user?.role !== 'SUPER_ADMIN') {
                    throw new http_exception_1.HttpException(403, 'Unauthorized: Admin only');
                }
                const stats = await wallet_service_1.WalletService.getWalletStats();
                return this.sendSuccess(res, { stats });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getPendingRefunds = async (req, res) => {
            try {
                if (req.user?.role !== 'SUPER_ADMIN') {
                    throw new http_exception_1.HttpException(403, 'Unauthorized: Admin only');
                }
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const refunds = await wallet_service_1.WalletService.getPendingRefunds?.() || [];
                const paginated = refunds.slice(offset, offset + limit);
                return this.sendSuccess(res, { refunds: paginated, total: refunds.length, limit, offset });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.approveRefund = async (req, res) => {
            try {
                if (req.user?.role !== 'SUPER_ADMIN') {
                    throw new http_exception_1.HttpException(403, 'Unauthorized: Admin only');
                }
                const { refundId } = req.params;
                const refund = await wallet_service_1.WalletService.approveRefund?.(refundId) || null;
                if (!refund) {
                    throw new http_exception_1.HttpException(404, 'Refund not found');
                }
                return this.sendSuccess(res, { refund });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.rejectRefund = async (req, res) => {
            try {
                if (req.user?.role !== 'SUPER_ADMIN') {
                    throw new http_exception_1.HttpException(403, 'Unauthorized: Admin only');
                }
                const { refundId } = req.params;
                const { reason } = req.body;
                if (!reason) {
                    throw new http_exception_1.HttpException(400, 'Reason is required for rejection');
                }
                const refund = await wallet_service_1.WalletService.rejectRefund?.(refundId, reason) || null;
                if (!refund) {
                    throw new http_exception_1.HttpException(404, 'Refund not found');
                }
                return this.sendSuccess(res, { refund });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
    getOwnerInfo(req) {
        const user = req.user;
        if (!user)
            throw new Error('Unauthorized');
        let ownerType;
        let ownerId;
        if (user.type === 'COMPANY' && user.companyId) {
            ownerType = 'COMPANY';
            ownerId = user.companyId;
        }
        else if (user.type === 'CONSULTANT') {
            ownerType = 'CONSULTANT';
            ownerId = user.id;
        }
        else if (user.role === 'SUPER_ADMIN' && !user.companyId) {
            ownerType = 'HRM8_GLOBAL';
            ownerId = 'global';
        }
        else {
            if (user.companyId) {
                ownerType = 'COMPANY';
                ownerId = user.companyId;
            }
            else {
                ownerType = 'CONSULTANT';
                ownerId = user.id;
            }
        }
        return { ownerType, ownerId };
    }
}
exports.WalletController = WalletController;
