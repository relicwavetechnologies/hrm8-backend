"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationTaskService = void 0;
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
const client_1 = require("@prisma/client");
class ApplicationTaskService {
    // Create a new task
    static async createTask(params) {
        const application = await prisma_1.prisma.application.findUnique({
            where: { id: params.applicationId },
        });
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        const task = await prisma_1.prisma.applicationTask.create({
            data: {
                application_id: params.applicationId,
                created_by: params.createdBy,
                title: params.title,
                description: params.description,
                status: params.status || client_1.TaskStatus.PENDING,
                priority: params.priority || client_1.TaskPriority.MEDIUM,
                type: params.type,
                assigned_to: params.assignedTo,
                due_date: params.dueDate,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        return task;
    }
    // Get all tasks for an application
    static async getTasks(applicationId) {
        const tasks = await prisma_1.prisma.applicationTask.findMany({
            where: { application_id: applicationId },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                { status: 'asc' },
                { priority: 'desc' },
                { created_at: 'desc' },
            ],
        });
        return tasks;
    }
    // Update a task
    static async updateTask(taskId, updates) {
        const task = await prisma_1.prisma.applicationTask.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new http_exception_1.HttpException(404, 'Task not found');
        }
        // If status is being changed to COMPLETED, set completed_at
        const completedAt = updates.status === client_1.TaskStatus.COMPLETED && task.status !== client_1.TaskStatus.COMPLETED
            ? new Date()
            : task.completed_at;
        // If status is being changed from COMPLETED to something else, clear completed_at
        const clearedCompletedAt = task.status === client_1.TaskStatus.COMPLETED && updates.status && updates.status !== client_1.TaskStatus.COMPLETED
            ? null
            : completedAt;
        const updatedTask = await prisma_1.prisma.applicationTask.update({
            where: { id: taskId },
            data: {
                title: updates.title,
                description: updates.description,
                status: updates.status,
                priority: updates.priority,
                type: updates.type,
                assigned_to: updates.assignedTo,
                due_date: updates.dueDate,
                completed_at: clearedCompletedAt,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        return updatedTask;
    }
    // Delete a task
    static async deleteTask(taskId) {
        const task = await prisma_1.prisma.applicationTask.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new http_exception_1.HttpException(404, 'Task not found');
        }
        await prisma_1.prisma.applicationTask.delete({
            where: { id: taskId },
        });
        return { success: true, message: 'Task deleted successfully' };
    }
    // Get task statistics for an application
    static async getTaskStats(applicationId) {
        const tasks = await prisma_1.prisma.applicationTask.findMany({
            where: { application_id: applicationId },
            select: { status: true, priority: true },
        });
        const stats = {
            total: tasks.length,
            pending: tasks.filter((t) => t.status === client_1.TaskStatus.PENDING).length,
            inProgress: tasks.filter((t) => t.status === client_1.TaskStatus.IN_PROGRESS).length,
            completed: tasks.filter((t) => t.status === client_1.TaskStatus.COMPLETED).length,
            cancelled: tasks.filter((t) => t.status === client_1.TaskStatus.CANCELLED).length,
            byPriority: {
                low: tasks.filter((t) => t.priority === client_1.TaskPriority.LOW).length,
                medium: tasks.filter((t) => t.priority === client_1.TaskPriority.MEDIUM).length,
                high: tasks.filter((t) => t.priority === client_1.TaskPriority.HIGH).length,
                urgent: tasks.filter((t) => t.priority === client_1.TaskPriority.URGENT).length,
            },
        };
        return stats;
    }
}
exports.ApplicationTaskService = ApplicationTaskService;
