import { Router } from 'express';
import { EmployerController } from './employer.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const employerController = new EmployerController();

// All employer routes require authentication
router.use(authenticate);

/**
 * @route POST /api/employer/hires/:applicationId/approve
 * @desc Approve a hire for a specific application and confirm commissions
 * @access Private (Employer only)
 */
router.post('/hires/:applicationId/approve', employerController.approveHire);

/**
 * @route GET /api/employer/jobs
 * @desc Get jobs belonging to the employer's company
 * @access Private (Employer only)
 */
router.get('/jobs', employerController.getJobs);

/**
 * @route PATCH /api/employer/jobs/:jobId/status
 * @desc Update job status (e.g., Close/Open)
 * @access Private (Employer only)
 */
router.patch('/jobs/:jobId/status', employerController.changeJobStatus);

export default router;
