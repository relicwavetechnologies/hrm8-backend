import { Router } from 'express';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';
import { PayoutsController } from './payouts.controller';

const router = Router();
const controller = new PayoutsController();

router.post('/beneficiaries', authenticateConsultant, controller.createBeneficiary);
router.get('/status', authenticateConsultant, controller.getStatus);
router.post('/login-link', authenticateConsultant, controller.getLoginLink);
router.post('/withdrawals/:id/execute', authenticateConsultant, controller.executeWithdrawal);

export default router;
