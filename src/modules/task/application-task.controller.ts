import { Response } from 'express';
import * as fs from 'fs';
import { BaseController } from '../../core/controller';
import { ApplicationTaskService } from './application-task.service';
import { AuthenticatedRequest } from '../../types';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class ApplicationTaskController extends BaseController {
  // Create a new task
  createTask = async (req: AuthenticatedRequest, res: Response) => {
    const logFile = '/tmp/hrm8-debug.log';
    const log = (msg: string) => fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);

    log(`ApplicationTaskController: createTask called. Params: ${JSON.stringify(req.params)}, Body: ${JSON.stringify(req.body)}, User: ${req.user?.id}`);

    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id: applicationId } = req.params as { id: string };
      const { title, description, status, priority, type, assignedTo, dueDate } = req.body;

      if (!title || typeof title !== 'string') {
        const err = 'Title is required';
        log(`ApplicationTaskController: Error: ${err}`);
        return this.sendError(res, new Error(err), 400);
      }

      log('ApplicationTaskController: Calling service...');
      const task = await ApplicationTaskService.createTask({
        applicationId,
        createdBy: req.user.id,
        title,
        description,
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        type,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
      log(`ApplicationTaskController: Task created: ${JSON.stringify(task)}`);

      return this.sendSuccess(res, { task });
    } catch (error) {
      log(`ApplicationTaskController: Error: ${error}`);
      return this.sendError(res, error);
    }
  };

  // Get all tasks for an application
  getTasks = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id: applicationId } = req.params as { id: string };

      const tasks = await ApplicationTaskService.getTasks(applicationId);
      return this.sendSuccess(res, { tasks });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Update a task
  updateTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { taskId } = req.params as { taskId: string };
      const { title, description, status, priority, type, assignedTo, dueDate } = req.body;

      const task = await ApplicationTaskService.updateTask(taskId, {
        title,
        description,
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        type,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      return this.sendSuccess(res, { task });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Delete a task
  deleteTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { taskId } = req.params as { taskId: string };

      const result = await ApplicationTaskService.deleteTask(taskId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Get task statistics
  getTaskStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const { id: applicationId } = req.params as { id: string };

      const stats = await ApplicationTaskService.getTaskStats(applicationId);
      return this.sendSuccess(res, { stats });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
