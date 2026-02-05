import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

// Authentication routes
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/verify-company', authController.verifyCompany);
router.post('/resend-verification', authController.resendVerification);

// Company registration (public)
router.post('/register/company', authController.registerCompany);

// Employee auto-join (public)
router.post('/register/employee', authController.registerEmployee);

// Signup request (public)
router.post('/signup', authController.createSignupRequest);

// Accept invitation (public)
router.post('/accept-invitation', authController.acceptInvitation);

// Verify company email (public)
router.post('/verify-company', authController.verifyCompany);

// Resend verification email (public)
router.post('/resend-verification', authController.resendVerification);

// Forgot password (public)
router.post('/forgot-password', authController.requestPasswordReset);

// Reset password (public)
router.post('/reset-password', authController.resetPassword);

export default router;
