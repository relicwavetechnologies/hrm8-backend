"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wallet_controller_1 = require("./wallet.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const walletController = new wallet_controller_1.WalletController();
// Account Management
router.get('/account', auth_middleware_1.authenticate, walletController.getAccount);
router.get('/verify', auth_middleware_1.authenticate, walletController.verifyWallet);
router.post('/account/verify', auth_middleware_1.authenticate, walletController.verifyWallet);
router.get('/balance', auth_middleware_1.authenticate, walletController.getBalance);
// Transactions
router.get('/transactions', auth_middleware_1.authenticate, walletController.getTransactions);
// Earnings
router.get('/earnings', auth_middleware_1.authenticate, walletController.getEarnings);
// Withdrawals
router.post('/withdrawals', auth_middleware_1.authenticate, walletController.requestWithdrawal);
router.get('/withdrawals', auth_middleware_1.authenticate, walletController.getWithdrawalHistory);
// Refunds
router.post('/refunds', auth_middleware_1.authenticate, walletController.requestRefund);
router.get('/refunds', auth_middleware_1.authenticate, walletController.getRefundHistory);
// Subscriptions
router.get('/subscriptions', auth_middleware_1.authenticate, walletController.getSubscriptions);
router.get('/subscriptions/:subscriptionId', auth_middleware_1.authenticate, walletController.getSubscription);
router.post('/subscriptions', auth_middleware_1.authenticate, walletController.createSubscription);
router.post('/subscriptions/:subscriptionId/renew', auth_middleware_1.authenticate, walletController.renewSubscription);
router.post('/subscriptions/:subscriptionId/cancel', auth_middleware_1.authenticate, walletController.cancelSubscription);
// Add-ons
router.post('/addons', auth_middleware_1.authenticate, walletController.purchaseAddonService);
// Stripe
router.post('/stripe/checkout', auth_middleware_1.authenticate, walletController.createStripeCheckoutSession);
// Admin Routes - Withdrawals
router.get('/admin/withdrawals/pending', auth_middleware_1.authenticate, walletController.getPendingWithdrawals);
router.post('/admin/withdrawals/:withdrawalId/approve', auth_middleware_1.authenticate, walletController.approveWithdrawal);
router.post('/admin/withdrawals/:withdrawalId/reject', auth_middleware_1.authenticate, walletController.rejectWithdrawal);
// Admin Routes - Refunds
router.get('/admin/refunds/pending', auth_middleware_1.authenticate, walletController.getPendingRefunds);
router.post('/admin/refunds/:refundId/approve', auth_middleware_1.authenticate, walletController.approveRefund);
router.post('/admin/refunds/:refundId/reject', auth_middleware_1.authenticate, walletController.rejectRefund);
// Admin Stats
router.get('/admin/stats', auth_middleware_1.authenticate, walletController.getWalletStats);
exports.default = router;
