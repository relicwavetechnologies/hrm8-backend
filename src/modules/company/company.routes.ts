import { Router } from 'express';
import { CompanyController } from './company.controller';
import { SubscriptionController } from '../subscription/subscription.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const companyController = new CompanyController();
const subscriptionController = new SubscriptionController();

// Instantiate controllers first
import { TransactionController } from './transaction.controller';
const transactionController = new TransactionController();
import { CompanySettingsController } from './company-settings.controller';
const settingsController = new CompanySettingsController();
import { CompanyCareersController } from './company-careers.controller';
const careersController = new CompanyCareersController();
import { JobBoardSettingsController } from './job-board-settings.controller';
const jobBoardSettingsController = new JobBoardSettingsController();
import { RefundRequestController } from './refund-request.controller';
const refundRequestController = new RefundRequestController();

// Public Routes (if any, e.g., lookup by domain)
// router.get('/lookup', companyController.lookup);

// Protected Routes
// Transactions
router.get('/transactions', authenticate, transactionController.getTransactions);
router.get('/transactions/stats', authenticate, transactionController.getStats);

// Settings
router.get('/settings', authenticate, settingsController.getSettings);
router.put('/settings', authenticate, settingsController.updateSettings);

// Protected Routes (Generic ID last)
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
router.get('/:id/subscription/active', authenticate, subscriptionController.getActive); // Proxy to SubscriptionController

// Company Settings (New Phase 2 Routes)
// Moved above /:id

// Company Careers (New Phase 2 Routes)
router.get('/careers', authenticate, careersController.getCareersPage);
router.put('/careers', authenticate, careersController.updateCareersPage);
router.post('/careers/upload', authenticate, careersController.uploadCareersImage);

// Job Board Settings (New Phase 2 Routes)
router.get('/job-board-settings', authenticate, jobBoardSettingsController.getSettings);
router.put('/job-board-settings', authenticate, jobBoardSettingsController.updateSettings);

// Transactions - Moved above

// Refund Requests
router.post('/refund-requests', authenticate, refundRequestController.createRequest);
router.get('/refund-requests', authenticate, refundRequestController.getRequests);
router.put('/refund-requests/:id/withdraw', authenticate, refundRequestController.withdrawRequest);
router.delete('/refund-requests/:id', authenticate, refundRequestController.cancelRequest);

// Verification
router.get('/:id/verification-status', authenticate, companyController.getVerificationStatus);
router.post('/:id/verify/email', authenticate, companyController.verifyByEmail);
router.post('/:id/verify/manual', authenticate, companyController.initiateManualVerification);
router.post('/:id/profile/complete', authenticate, companyController.completeProfile);

export default router;
