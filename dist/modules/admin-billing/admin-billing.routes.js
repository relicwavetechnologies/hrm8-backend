"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_billing_controller_1 = require("./admin-billing.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const controller = new admin_billing_controller_1.AdminBillingController();
// Commissions
router.get('/commissions', auth_middleware_1.authenticate, controller.getCommissions);
router.get('/commissions/consultant/:consultantId', auth_middleware_1.authenticate, controller.getConsultantCommissions);
router.post('/commissions/:commissionId/pay', auth_middleware_1.authenticate, controller.payCommission);
router.post('/commissions/bulk-pay', auth_middleware_1.authenticate, controller.bulkPayCommissions);
// Revenue
router.get('/revenue/pending', auth_middleware_1.authenticate, controller.getPendingRevenue);
router.get('/revenue/region/:regionId', auth_middleware_1.authenticate, controller.getRegionalRevenue);
router.post('/revenue/region/:regionId/calculate', auth_middleware_1.authenticate, controller.calculateMonthlyRevenue);
router.post('/revenue/process-all', auth_middleware_1.authenticate, controller.processAllRegionsRevenue);
// Settlements
router.get('/settlements', auth_middleware_1.authenticate, controller.getSettlements);
router.get('/settlements/stats', auth_middleware_1.authenticate, controller.getSettlementStats);
router.get('/settlements/:settlementId', auth_middleware_1.authenticate, controller.getSettlementById);
router.post('/settlements/licensee/:licenseeId/generate', auth_middleware_1.authenticate, controller.generateSettlement);
router.post('/settlements/generate-all', auth_middleware_1.authenticate, controller.generateAllSettlements);
router.post('/settlements/:settlementId/pay', auth_middleware_1.authenticate, controller.markSettlementPaid);
// Attribution
router.get('/attribution/:companyId', auth_middleware_1.authenticate, controller.getAttribution);
router.get('/attribution/:companyId/history', auth_middleware_1.authenticate, controller.getAttributionHistory);
router.post('/attribution/:companyId/lock', auth_middleware_1.authenticate, controller.lockAttribution);
router.post('/attribution/:companyId/override', auth_middleware_1.authenticate, controller.overrideAttribution);
exports.default = router;
