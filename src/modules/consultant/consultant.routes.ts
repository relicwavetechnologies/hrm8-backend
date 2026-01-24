import { Router } from 'express';
import { ConsultantController } from './consultant.controller';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';

const router = Router();
const consultantController = new ConsultantController();

// Auth
router.post('/auth/login', consultantController.login);
router.post('/auth/logout', consultantController.logout);

// Profile
router.get('/profile', authenticateConsultant, consultantController.getProfile);
router.put('/profile', authenticateConsultant, consultantController.updateProfile);

// Jobs
router.get('/jobs', authenticateConsultant, consultantController.getJobs);
router.get('/jobs/:id', authenticateConsultant, consultantController.getJobDetails);
router.post('/jobs/:id/shortlist', authenticateConsultant, consultantController.submitShortlist);
router.post('/jobs/:id/flag', authenticateConsultant, consultantController.flagJob);
router.post('/jobs/:id/log', authenticateConsultant, consultantController.logJobActivity);
router.get('/jobs/:id/pipeline', authenticateConsultant, consultantController.getJobPipeline);
router.patch('/jobs/:id/pipeline', authenticateConsultant, consultantController.updateJobPipeline);

// Commissions
router.get('/commissions', authenticateConsultant, consultantController.getCommissions);

// Performance
router.get('/performance', authenticateConsultant, consultantController.getPerformance);

export default router;
