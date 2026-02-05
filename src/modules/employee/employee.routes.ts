import { Router } from 'express';
import { EmployeeController } from './employee.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/role.middleware';

const router = Router();
const controller = new EmployeeController();

// All employee routes require authentication
router.use(authenticate);

// Get all company users
router.get('/', controller.getCompanyUsers);

// Invite employees (admin only)
router.post('/invite', requireAdmin, controller.inviteEmployees);

// Get all invitations for company
router.get('/invitations', controller.getInvitations);

// Cancel invitation (admin only)
router.delete('/invitations/:id', requireAdmin, controller.cancelInvitation);

// Update user role (admin only)
router.put('/:id/role', requireAdmin, controller.updateUserRole);

export default router;
