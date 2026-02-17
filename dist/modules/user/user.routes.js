"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
// User Management
router.get('/', auth_middleware_1.authenticate, userController.getUsers);
router.post('/', auth_middleware_1.authenticate, userController.createUser);
router.get('/:id', auth_middleware_1.authenticate, userController.getUser);
router.put('/:id', auth_middleware_1.authenticate, userController.updateUser);
router.delete('/:id', auth_middleware_1.authenticate, userController.deleteUser);
// Preferences
router.get('/preferences/notifications', auth_middleware_1.authenticate, userController.getNotificationPreferences);
router.put('/preferences/notifications', auth_middleware_1.authenticate, userController.updateNotificationPreferences);
// Alert Rules
router.get('/alerts/rules', auth_middleware_1.authenticate, userController.getAlertRules);
router.post('/alerts/rules', auth_middleware_1.authenticate, userController.createAlertRule);
router.put('/alerts/rules/:id', auth_middleware_1.authenticate, userController.updateAlertRule);
router.delete('/alerts/rules/:id', auth_middleware_1.authenticate, userController.deleteAlertRule);
exports.default = router;
