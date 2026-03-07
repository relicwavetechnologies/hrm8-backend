import { Router } from 'express';
import { authenticateConsultant } from '../../middlewares/consultant-auth.middleware';
import { authenticateHrm8 } from '../../middlewares/hrm8-auth.middleware';
import { requireHrm8Role } from '../../middlewares/hrm8-auth.middleware';
import { PayoutsController } from './payouts.controller';
import { ReconciliationService } from './reconciliation.service';

const router = Router();
const controller = new PayoutsController();

router.post('/beneficiaries', authenticateConsultant, controller.createBeneficiary);
router.get('/status', authenticateConsultant, controller.getStatus);
router.post('/login-link', authenticateConsultant, controller.getLoginLink);
router.post('/withdrawals/:id/execute', authenticateConsultant, controller.executeWithdrawal);

router.post(
  '/admin/reconciliation/run',
  authenticateHrm8,
  requireHrm8Role(['GLOBAL_ADMIN']),
  async (_req, res, next) => {
    try {
      const result = await ReconciliationService.runFullReconciliation();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
