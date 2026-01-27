import { Router } from 'express';
import { EmailTriggerController } from './email-triggers.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new EmailTriggerController();

router.use(authenticate);

// Get all triggers
router.get('/', controller.getTriggers);

// Create trigger
router.post('/', controller.createTrigger);

// Get trigger details
router.get('/:id', controller.getTrigger);

// Update trigger
router.put('/:id', controller.updateTrigger);

// Delete trigger
router.delete('/:id', controller.deleteTrigger);

// Test trigger
router.post('/:id/test', controller.testTrigger);

export default router;
