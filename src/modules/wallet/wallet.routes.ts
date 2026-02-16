import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const walletController = new WalletController();

// Account Management
router.get('/account', authenticate, walletController.getAccount as any);
router.get('/verify', authenticate, walletController.verifyWallet as any);
router.post('/account/verify', authenticate, walletController.verifyWallet as any);
router.get('/balance', authenticate, walletController.getBalance as any);

// Transactions
router.get('/transactions', authenticate, walletController.getTransactions as any);

// Earnings
router.get('/earnings', authenticate, walletController.getEarnings as any);

// Withdrawals
router.post('/withdrawals', authenticate, walletController.requestWithdrawal as any);
router.get('/withdrawals', authenticate, walletController.getWithdrawalHistory as any);

// Refunds
router.post('/refunds', authenticate, walletController.requestRefund as any);
router.get('/refunds', authenticate, walletController.getRefundHistory as any);

// Subscriptions
router.get('/subscriptions', authenticate, walletController.getSubscriptions as any);
router.get('/subscriptions/:subscriptionId', authenticate, walletController.getSubscription as any);
router.post('/subscriptions', authenticate, walletController.createSubscription as any);
router.post('/subscriptions/:subscriptionId/renew', authenticate, walletController.renewSubscription as any);
router.post('/subscriptions/:subscriptionId/cancel', authenticate, walletController.cancelSubscription as any);

// Add-ons
router.post('/addons', authenticate, walletController.purchaseAddonService as any);

// Stripe
router.post('/stripe/checkout', authenticate, walletController.createStripeCheckoutSession as any);

// Admin Routes - Withdrawals
router.get('/admin/withdrawals/pending', authenticate, walletController.getPendingWithdrawals as any);
router.post('/admin/withdrawals/:withdrawalId/approve', authenticate, walletController.approveWithdrawal as any);
router.post('/admin/withdrawals/:withdrawalId/reject', authenticate, walletController.rejectWithdrawal as any);

// Admin Routes - Refunds
router.get('/admin/refunds/pending', authenticate, walletController.getPendingRefunds as any);
router.post('/admin/refunds/:refundId/approve', authenticate, walletController.approveRefund as any);
router.post('/admin/refunds/:refundId/reject', authenticate, walletController.rejectRefund as any);

// Admin Stats
router.get('/admin/stats', authenticate, walletController.getWalletStats as any);

export default router;
