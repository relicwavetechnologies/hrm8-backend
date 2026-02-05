import { Router } from 'express';
import { DepartmentsController } from './departments.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new DepartmentsController();

router.get('/', authenticate, controller.getDepartments);
router.put('/:id', authenticate, controller.updateDepartment);
router.delete('/:id', authenticate, controller.deleteDepartment);

export default router;
