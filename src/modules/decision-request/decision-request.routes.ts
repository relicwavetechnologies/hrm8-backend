import { Router } from 'express';
import { DecisionRequestController } from './decision-request.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new DecisionRequestController();

// HR/Company endpoints - require company auth
router.get('/jobs/:jobId', authenticate, controller.listByJob);
router.get('/company', authenticate, controller.listByCompany);
router.get('/company/:companyId', authenticate, controller.listByCompany);
router.get('/:id', authenticate, controller.getById);
router.post('/:id/approve', authenticate, controller.approve);
router.post('/:id/reject', authenticate, controller.reject);

export default router;
