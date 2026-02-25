import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { BillingController } from './billing.controller';

const router = Router();
const controller = new BillingController();

router.post('/checkout', authenticate, controller.createCheckout);
router.get('/payments/:paymentAttemptId', authenticate, controller.getPaymentStatus);
router.post('/refunds/:paymentAttemptId', authenticate, controller.refundPayment);
router.post('/webhooks/airwallex', controller.handleAirwallexWebhook);

export default router;
