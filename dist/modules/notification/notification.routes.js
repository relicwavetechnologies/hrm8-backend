"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("./notification.controller");
const unified_auth_middleware_1 = require("../../middlewares/unified-auth.middleware");
// Note: This router assumes standard 'authenticate' middleware.
// If you need to support Candidates/Consultants, you might need a unified auth middleware
// or mount this router multiple times with different middlewares.
const router = (0, express_1.Router)();
const notificationController = new notification_controller_1.NotificationController();
router.get('/', unified_auth_middleware_1.authenticateUnified, notificationController.list);
router.get('/:id', unified_auth_middleware_1.authenticateUnified, notificationController.getOne);
router.patch('/:id/read', unified_auth_middleware_1.authenticateUnified, notificationController.markRead);
router.patch('/read-all', unified_auth_middleware_1.authenticateUnified, notificationController.markAllRead);
exports.default = router;
