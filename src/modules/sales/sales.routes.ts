import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const salesController = new SalesController();

// Opportunities
router.get('/opportunities', authenticateConsultant, salesController.getOpportunities);
router.post('/opportunities', authenticateConsultant, salesController.createOpportunity);
router.get('/opportunities/stats', authenticateConsultant, salesController.getPipelineStats);
router.put('/opportunities/:id', authenticateConsultant, salesController.updateOpportunity);

// Activities
router.get('/activities', authenticateConsultant, salesController.getActivities);
router.post('/activities', authenticateConsultant, salesController.createActivity);

export default router;
