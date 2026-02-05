import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { SubscriptionController } from '../subscription/subscription.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const walletController = new WalletController();
const subscriptionController = new SubscriptionController();

router.get('/account', authenticate, walletController.getAccount);
router.get('/balance', authenticate, walletController.getBalance);
router.get('/transactions', authenticate, walletController.getTransactions);
router.get('/history', authenticate, walletController.getTransactions); // Alias for transactions
router.get('/transaction/:transactionId', authenticate, walletController.getTransaction);
router.get('/verify', authenticate, walletController.verifyWallet);

// Withdrawal
router.post('/withdrawal/request', authenticate, walletController.requestWithdrawal);

router.get('/subscriptions', authenticate, subscriptionController.list); // For backward compatibility/dashboard
// Add more routes as needed (history, verify, etc.)

export default router;
