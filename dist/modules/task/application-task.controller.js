"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationTaskController = void 0;
const controller_1 = require("../../core/controller");
const application_task_service_1 = require("./application-task.service");
class ApplicationTaskController extends controller_1.BaseController {
    constructor() {
        super(...arguments);
        // Create a new task
        this.createTask = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const { title, description, status, priority, type, assignedTo, dueDate } = req.body;
                if (!title || typeof title !== 'string') {
                    return this.sendError(res, new Error('Title is required'), 400);
                }
                const task = await application_task_service_1.ApplicationTaskService.createTask({
                    applicationId,
                    createdBy: req.user.id,
                    title,
                    description,
                    status: status,
                    priority: priority,
                    type,
                    assignedTo,
                    dueDate: dueDate ? new Date(dueDate) : undefined,
                });
                return this.sendSuccess(res, { task });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Get all tasks for an application
        this.getTasks = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const tasks = await application_task_service_1.ApplicationTaskService.getTasks(applicationId);
                return this.sendSuccess(res, { tasks });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Update a task
        this.updateTask = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { taskId } = req.params;
                const { title, description, status, priority, type, assignedTo, dueDate } = req.body;
                const task = await application_task_service_1.ApplicationTaskService.updateTask(taskId, {
                    title,
                    description,
                    status: status,
                    priority: priority,
                    type,
                    assignedTo,
                    dueDate: dueDate ? new Date(dueDate) : undefined,
                });
                return this.sendSuccess(res, { task });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Delete a task
        this.deleteTask = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { taskId } = req.params;
                const result = await application_task_service_1.ApplicationTaskService.deleteTask(taskId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Get task statistics
        this.getTaskStats = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const stats = await application_task_service_1.ApplicationTaskService.getTaskStats(applicationId);
                return this.sendSuccess(res, { stats });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.ApplicationTaskController = ApplicationTaskController;
