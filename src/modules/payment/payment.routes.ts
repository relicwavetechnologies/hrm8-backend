import express, { Router } from 'express';
import { PaymentController } from './payment.controller';

const router = Router();
const paymentController = new PaymentController();

// Stripe Webhook needs raw body
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhookHandler);

export default router;
