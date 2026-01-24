"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
// import { SignupRequestController } from '../controllers/signupRequest/SignupRequestController'; // TODO: Migrate
// import { authenticate } from '../middleware/auth'; // TODO: Migrate
// import validators...
const router = (0, express_1.Router)();
// Company registration
router.post('/register/company', auth_controller_1.authController.registerCompany);
// Login
router.post('/login', auth_controller_1.authController.login);
// Accept invitation
router.post('/accept-invitation', auth_controller_1.authController.acceptInvitation);
// ... others ...
exports.default = router;
