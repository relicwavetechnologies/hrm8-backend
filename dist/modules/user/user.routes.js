"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/me', auth_middleware_1.authenticate, user_controller_1.userController.getMe);
router.post('/change-password', auth_middleware_1.authenticate, user_controller_1.userController.changePassword);
exports.default = router;
