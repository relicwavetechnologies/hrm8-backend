"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const consultant_auth_middleware_1 = require("../../middlewares/consultant-auth.middleware");
const hrm8_auth_middleware_1 = require("../../middlewares/hrm8-auth.middleware");
const hrm8_auth_middleware_2 = require("../../middlewares/hrm8-auth.middleware");
const payouts_controller_1 = require("./payouts.controller");
const reconciliation_service_1 = require("./reconciliation.service");
const router = (0, express_1.Router)();
const controller = new payouts_controller_1.PayoutsController();
router.post('/beneficiaries', consultant_auth_middleware_1.authenticateConsultant, controller.createBeneficiary);
router.get('/status', consultant_auth_middleware_1.authenticateConsultant, controller.getStatus);
router.post('/login-link', consultant_auth_middleware_1.authenticateConsultant, controller.getLoginLink);
router.post('/withdrawals/:id/execute', consultant_auth_middleware_1.authenticateConsultant, controller.executeWithdrawal);
router.post('/admin/reconciliation/run', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), async (_req, res, next) => {
    try {
        const result = await reconciliation_service_1.ReconciliationService.runFullReconciliation();
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
