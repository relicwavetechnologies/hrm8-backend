import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/signup', authController.signup);
router.post('/register/company', authController.registerCompany);
router.post('/verify-company', authController.verifyCompany);
router.post('/resend-verification', authController.resendVerification);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/lead-conversion/accept', authController.acceptLeadConversionInvite);

export default router;
