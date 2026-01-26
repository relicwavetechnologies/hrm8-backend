import { Router } from 'express';
import { IntegrationController } from './integration.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const integrationController = new IntegrationController();

router.post('/', authenticate, integrationController.configure);
router.get('/', authenticate, integrationController.list);
router.delete('/:id', authenticate, integrationController.remove);

// Stripe Integrations
router.post('/stripe/create-checkout-session', authenticate, integrationController.createCheckoutSession);
router.post('/stripe/mock-payment-success', authenticate, integrationController.handleMockPaymentSuccess);

export default router;
