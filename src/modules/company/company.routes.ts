import { Router } from 'express';
import { CompanyController } from './company.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const companyController = new CompanyController();

// Public Routes (if any, e.g., lookup by domain)
// router.get('/lookup', companyController.lookup);

// Protected Routes
router.get('/:id', authenticate, companyController.getCompany);
router.put('/:id', authenticate, companyController.updateCompany);

// Profile
router.get('/:id/profile', authenticate, companyController.getProfile);
router.put('/:id/profile', authenticate, companyController.updateProfile);

// Settings
router.put('/:id/job-assignment-mode', authenticate, companyController.updateJobAssignmentMode);

export default router;
