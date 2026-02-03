import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const walletController = new WalletController();

// Account Management
router.get('/account', authenticate, walletController.getAccount);
router.get('/verify', authenticate, walletController.verifyWallet);
router.post('/account/verify', authenticate, walletController.verifyWallet);
router.get('/balance', authenticate, walletController.getBalance);

// Transactions
router.get('/transactions', authenticate, walletController.getTransactions);

// Earnings
router.get('/earnings', authenticate, walletController.getEarnings);

// Withdrawals
router.post('/withdrawals', authenticate, walletController.requestWithdrawal);
router.get('/withdrawals', authenticate, walletController.getWithdrawalHistory);

// Refunds
router.post('/refunds', authenticate, walletController.requestRefund);
router.get('/refunds', authenticate, walletController.getRefundHistory);

// Subscriptions
router.get('/subscriptions', authenticate, walletController.getSubscriptions);
router.get('/subscriptions/:subscriptionId', authenticate, walletController.getSubscription);
router.post('/subscriptions', authenticate, walletController.createSubscription);
router.post('/subscriptions/:subscriptionId/renew', authenticate, walletController.renewSubscription);
router.post('/subscriptions/:subscriptionId/cancel', authenticate, walletController.cancelSubscription);

// Add-ons
router.post('/addons', authenticate, walletController.purchaseAddonService);

// Stripe
router.post('/stripe/checkout', authenticate, walletController.createStripeCheckoutSession);

// Admin Routes - Withdrawals
router.get('/admin/withdrawals/pending', authenticate, walletController.getPendingWithdrawals);
router.post('/admin/withdrawals/:withdrawalId/approve', authenticate, walletController.approveWithdrawal);
router.post('/admin/withdrawals/:withdrawalId/reject', authenticate, walletController.rejectWithdrawal);

// Admin Routes - Refunds
router.get('/admin/refunds/pending', authenticate, walletController.getPendingRefunds);
router.post('/admin/refunds/:refundId/approve', authenticate, walletController.approveRefund);
router.post('/admin/refunds/:refundId/reject', authenticate, walletController.rejectRefund);

// Admin Stats
router.get('/admin/stats', authenticate, walletController.getWalletStats);

export default router;
