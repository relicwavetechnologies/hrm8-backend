"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const application_task_controller_1 = require("./application-task.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const taskController = new application_task_controller_1.ApplicationTaskController();
// Task Routes for Applications
router.post('/:id/tasks', auth_middleware_1.authenticate, taskController.createTask);
router.get('/:id/tasks', auth_middleware_1.authenticate, taskController.getTasks);
router.get('/:id/tasks/stats', auth_middleware_1.authenticate, taskController.getTaskStats);
router.put('/:id/tasks/:taskId', auth_middleware_1.authenticate, taskController.updateTask);
router.delete('/:id/tasks/:taskId', auth_middleware_1.authenticate, taskController.deleteTask);
exports.default = router;
