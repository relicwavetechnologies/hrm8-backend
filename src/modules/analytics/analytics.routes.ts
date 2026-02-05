import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const analyticsController = new AnalyticsController();

// All analytics routes require authentication
router.use(authenticate);

// Job analytics
router.get('/jobs/:jobId/breakdown', analyticsController.getJobAnalyticsBreakdown);
router.get('/jobs/:jobId/trends', analyticsController.getJobAnalyticsTrends);

// Company analytics
router.get('/company/overview', analyticsController.getCompanyAnalyticsOverview);

export default router;
