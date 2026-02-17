import { Router } from 'express';
import { SignupRequestController } from './signup-request.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new SignupRequestController();

router.get('/', authenticate, controller.getAll);
router.get('/pending', authenticate, controller.getPending);
router.post('/:id/approve', authenticate, controller.approve);
router.post('/:id/reject', authenticate, controller.reject);

export default router;
