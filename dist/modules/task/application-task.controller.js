"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationTaskController = void 0;
const fs = __importStar(require("fs"));
const controller_1 = require("../../core/controller");
const application_task_service_1 = require("./application-task.service");
class ApplicationTaskController extends controller_1.BaseController {
    constructor() {
        super(...arguments);
        // Create a new task
        this.createTask = async (req, res) => {
            const logFile = '/tmp/hrm8-debug.log';
            const log = (msg) => fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
            log(`ApplicationTaskController: createTask called. Params: ${JSON.stringify(req.params)}, Body: ${JSON.stringify(req.body)}, User: ${req.user?.id}`);
            try {
                if (!req.user)
                    throw new Error('Unauthorized');
                const { id: applicationId } = req.params;
                const { title, description, status, priority, type, assignedTo, dueDate } = req.body;
                if (!title || typeof title !== 'string') {
                    const err = 'Title is required';
                    log(`ApplicationTaskController: Error: ${err}`);
                    return this.sendError(res, new Error(err), 400);
                }
                log('ApplicationTaskController: Calling service...');
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
                log(`ApplicationTaskController: Task created: ${JSON.stringify(task)}`);
                return this.sendSuccess(res, { task });
            }
            catch (error) {
                log(`ApplicationTaskController: Error: ${error}`);
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
                }, req.user.id);
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
                const result = await application_task_service_1.ApplicationTaskService.deleteTask(taskId, req.user.id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Get all tasks for the authenticated company
        this.getCompanyTasks = async (req, res) => {
            try {
                if (!req.user?.companyId)
                    return this.sendError(res, new Error('Unauthorized'), 401);
                const tasks = await application_task_service_1.ApplicationTaskService.getCompanyTasks(req.user.companyId);
                return this.sendSuccess(res, { tasks });
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
