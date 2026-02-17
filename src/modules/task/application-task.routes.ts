import { Router } from 'express';
import { ApplicationTaskController } from './application-task.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const taskController = new ApplicationTaskController();

// Task Routes for Applications
router.post('/:id/tasks', authenticate, taskController.createTask);
router.get('/:id/tasks', authenticate, taskController.getTasks);
router.get('/:id/tasks/stats', authenticate, taskController.getTaskStats);
router.put('/:id/tasks/:taskId', authenticate, taskController.updateTask);
router.delete('/:id/tasks/:taskId', authenticate, taskController.deleteTask);

export default router;
