import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { BillingController } from './billing.controller';

const router = Router();
const controller = new BillingController();

router.post('/checkout', authenticate, controller.createCheckout);
router.get('/airwallex-redirect', controller.airwallexRedirect);
router.get('/payments/:paymentAttemptId', authenticate, controller.getPaymentStatus);
router.post('/refunds/:paymentAttemptId', authenticate, controller.refundPayment);
// Webhook mounted separately in express.ts with express.raw() for signature verification

export default router;
