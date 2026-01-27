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
router.get('/:id/subscription/active', authenticate, subscriptionController.getActive); // Proxy to SubscriptionController

// Company Settings (New Phase 2 Routes)
import { CompanySettingsController } from './company-settings.controller';
const settingsController = new CompanySettingsController();
router.get('/settings', authenticate, settingsController.getSettings);
router.put('/settings', authenticate, settingsController.updateSettings);

// Company Careers (New Phase 2 Routes)
import { CompanyCareersController } from './company-careers.controller';
const careersController = new CompanyCareersController();
router.get('/careers', authenticate, careersController.getCareersPage);
router.put('/careers', authenticate, careersController.updateCareersPage);
router.post('/careers/upload', authenticate, careersController.uploadCareersImage);

// Job Board Settings (New Phase 2 Routes)
import { JobBoardSettingsController } from './job-board-settings.controller';
const jobBoardSettingsController = new JobBoardSettingsController();
router.get('/job-board-settings', authenticate, jobBoardSettingsController.getSettings);
router.put('/job-board-settings', authenticate, jobBoardSettingsController.updateSettings);

export default router;
