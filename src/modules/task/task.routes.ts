import { Router } from 'express';
import { ApplicationTaskController } from './application-task.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const taskController = new ApplicationTaskController();

// Bulk company-wide task fetch
router.get('/company', authenticate, taskController.getCompanyTasks);

export default router;
