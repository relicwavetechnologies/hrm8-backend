"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const communication_controller_1 = require("./communication.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const communicationController = new communication_controller_1.CommunicationController();
// Internal/Admin routes
router.post('/send-test', auth_middleware_1.authenticate, communicationController.sendTestEmail);
exports.default = router;
