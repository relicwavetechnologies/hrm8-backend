import { Router } from 'express';
import { CompanyController } from './company.controller';
import { SubscriptionController } from '../subscription/subscription.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const companyController = new CompanyController();
const subscriptionController = new SubscriptionController();

// Public Routes (if any, e.g., lookup by domain)
// router.get('/lookup', companyController.lookup);

// Protected Routes
router.get('/:id', authenticate, companyController.getCompany);
router.put('/:id', authenticate, companyController.updateCompany);

// Profile
router.get('/:id/profile', authenticate, companyController.getProfile);
router.put('/:id/profile', authenticate, companyController.updateProfile);

// Settings
router.get('/:id/job-assignment-settings', authenticate, companyController.getJobAssignmentSettings);
router.put('/:id/job-assignment-mode', authenticate, companyController.updateJobAssignmentMode);

// Stats
router.get('/:id/stats', authenticate, companyController.getStats);
router.get('/:id/subscription/active', authenticate, subscriptionController.getActive);

// Transactions
router.get('/transactions', authenticate, companyController.getTransactions);
router.get('/transactions/stats', authenticate, companyController.getTransactionStats);

// Refund Requests
router.post('/refund-requests', authenticate, companyController.createRefundRequest);
router.get('/refund-requests', authenticate, companyController.getRefundRequests);
router.delete('/refund-requests/:id', authenticate, companyController.cancelRefundRequest);
router.put('/refund-requests/:id/withdraw', authenticate, companyController.withdrawRefundRequest);

export default router;
