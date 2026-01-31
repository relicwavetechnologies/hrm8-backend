import { Router } from 'express';
import { AdminBillingController } from './admin-billing.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new AdminBillingController();

// Commissions
router.get('/commissions', authenticate, controller.getCommissions);
router.get('/commissions/consultant/:consultantId', authenticate, controller.getConsultantCommissions);
router.post('/commissions/:commissionId/pay', authenticate, controller.payCommission);
router.post('/commissions/bulk-pay', authenticate, controller.bulkPayCommissions);

// Revenue
router.get('/revenue/pending', authenticate, controller.getPendingRevenue);
router.get('/revenue/region/:regionId', authenticate, controller.getRegionalRevenue);
router.post('/revenue/region/:regionId/calculate', authenticate, controller.calculateMonthlyRevenue);
router.post('/revenue/process-all', authenticate, controller.processAllRegionsRevenue);

// Settlements
router.get('/settlements', authenticate, controller.getSettlements);
router.get('/settlements/stats', authenticate, controller.getSettlementStats);
router.get('/settlements/:settlementId', authenticate, controller.getSettlementById);
router.post('/settlements/licensee/:licenseeId/generate', authenticate, controller.generateSettlement);
router.post('/settlements/generate-all', authenticate, controller.generateAllSettlements);
router.post('/settlements/:settlementId/pay', authenticate, controller.markSettlementPaid);

// Attribution
router.get('/attribution/:companyId', authenticate, controller.getAttribution);
router.get('/attribution/:companyId/history', authenticate, controller.getAttributionHistory);
router.post('/attribution/:companyId/lock', authenticate, controller.lockAttribution);
router.post('/attribution/:companyId/override', authenticate, controller.overrideAttribution);

export default router;
