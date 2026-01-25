import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const subscriptionController = new SubscriptionController();

router.post('/', authenticate, subscriptionController.create);
router.get('/active', authenticate, subscriptionController.getActive); // /api/subscriptions/active (current user)
router.get('/company/:companyId/active', authenticate, subscriptionController.getActive); // /api/subscriptions/company/:id/active

export default router;
