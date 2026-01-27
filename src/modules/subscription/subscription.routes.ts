import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const subscriptionController = new SubscriptionController();

// Basic CRUD/Listing
router.post('/', authenticate, subscriptionController.create);
router.get('/active', authenticate, subscriptionController.getActive);
router.get('/company/:companyId/active', authenticate, subscriptionController.getActive);
router.get('/', authenticate, subscriptionController.list);
router.get('/company/:companyId', authenticate, subscriptionController.list);

// Single Subscription Management
router.get('/:id', authenticate, subscriptionController.getById);
router.get('/:id/stats', authenticate, subscriptionController.getStats);
router.post('/:id/renew', authenticate, subscriptionController.renew);
router.post('/:id/cancel', authenticate, subscriptionController.cancel);

export default router;
