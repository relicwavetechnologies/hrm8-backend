import { Router } from 'express';
import { AdminBillingController } from './admin-billing.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new AdminBillingController();

// Commissions
router.get('/commissions', authenticate, controller.getCommissions as any);
router.get('/commissions/consultant/:consultantId', authenticate, controller.getConsultantCommissions as any);
router.post('/commissions/:commissionId/pay', authenticate, controller.payCommission as any);
router.post('/commissions/bulk-pay', authenticate, controller.bulkPayCommissions as any);

// Revenue
router.get('/revenue/pending', authenticate, controller.getPendingRevenue as any);
router.get('/revenue/region/:regionId', authenticate, controller.getRegionalRevenue as any);
router.post('/revenue/region/:regionId/calculate', authenticate, controller.calculateMonthlyRevenue as any);
router.post('/revenue/process-all', authenticate, controller.processAllRegionsRevenue as any);

// Settlements
router.get('/settlements', authenticate, controller.getSettlements as any);
router.get('/settlements/stats', authenticate, controller.getSettlementStats as any);
router.get('/settlements/:settlementId', authenticate, controller.getSettlementById as any);
router.post('/settlements/licensee/:licenseeId/generate', authenticate, controller.generateSettlement as any);
router.post('/settlements/generate-all', authenticate, controller.generateAllSettlements as any);
router.post('/settlements/:settlementId/pay', authenticate, controller.markSettlementPaid as any);

// Attribution
router.get('/attribution/:companyId', authenticate, controller.getAttribution as any);
router.get('/attribution/:companyId/history', authenticate, controller.getAttributionHistory as any);
router.post('/attribution/:companyId/lock', authenticate, controller.lockAttribution as any);
router.post('/attribution/:companyId/override', authenticate, controller.overrideAttribution as any);

export default router;
