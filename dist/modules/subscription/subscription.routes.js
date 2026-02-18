"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_controller_1 = require("./subscription.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const subscriptionController = new subscription_controller_1.SubscriptionController();
router.post('/', auth_middleware_1.authenticate, subscriptionController.create);
router.get('/active', auth_middleware_1.authenticate, subscriptionController.getActive); // /api/subscriptions/active (current user)
router.get('/company/:companyId/active', auth_middleware_1.authenticate, subscriptionController.getActive); // /api/subscriptions/company/:id/active
exports.default = router;
