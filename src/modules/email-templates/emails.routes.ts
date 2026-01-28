import { Router } from 'express';
import { EmailController } from './emails.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new EmailController();

router.use(authenticate);

// Send email
router.post('/send', controller.sendEmail);

// Get sent emails
router.get('/sent', controller.getSent);

// Get inbox
router.get('/inbox', controller.getInbox);

// Get email details
router.get('/:id', controller.getEmail);

// Resend email
router.post('/:id/resend', controller.resendEmail);

export default router;
