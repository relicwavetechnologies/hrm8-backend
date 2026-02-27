"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const application_task_controller_1 = require("./application-task.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const taskController = new application_task_controller_1.ApplicationTaskController();
// Bulk company-wide task fetch
router.get('/company', auth_middleware_1.authenticate, taskController.getCompanyTasks);
exports.default = router;
