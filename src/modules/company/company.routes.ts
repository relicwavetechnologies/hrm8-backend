import { Router } from 'express';
import { CompanyController } from './company.controller';
import { SubscriptionController } from '../subscription/subscription.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const companyController = new CompanyController();
const subscriptionController = new SubscriptionController();

// Public Routes (if any, e.g., lookup by domain)
// router.get('/lookup', companyController.lookup as any as any);

// Protected Routes
router.get('/:id', authenticate, companyController.getCompany as any as any);
router.put('/:id', authenticate, companyController.updateCompany as any as any);

// Profile
router.get('/:id/profile', authenticate, companyController.getProfile as any as any);
router.put('/:id/profile', authenticate, companyController.updateProfile as any as any);

// Settings
router.get('/:id/job-assignment-settings', authenticate, companyController.getJobAssignmentSettings as any as any);
router.put('/:id/job-assignment-mode', authenticate, companyController.updateJobAssignmentMode as any as any);

// Stats
router.get('/:id/stats', authenticate, companyController.getStats as any as any);
router.get('/:id/subscription/active', authenticate, subscriptionController.getActive as any as any);

// Transactions
router.get('/transactions', authenticate, companyController.getTransactions as any as any);
router.get('/transactions/stats', authenticate, companyController.getTransactionStats as any as any);

// Refund Requests
router.post('/refund-requests', authenticate, companyController.createRefundRequest as any as any);
router.get('/refund-requests', authenticate, companyController.getRefundRequests as any as any);
router.delete('/refund-requests/:id', authenticate, companyController.cancelRefundRequest as any as any);
router.put('/refund-requests/:id/withdraw', authenticate, companyController.withdrawRefundRequest as any as any);

export default router;
