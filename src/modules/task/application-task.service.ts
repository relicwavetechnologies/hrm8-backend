import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class ApplicationTaskService {
  // Create a new task
  static async createTask(params: {
    applicationId: string;
    createdBy: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: string;
    assignedTo?: string;
    dueDate?: Date;
  }) {
    const application = await prisma.application.findUnique({
      where: { id: params.applicationId },
    });

    if (!application) {
      throw new HttpException(404, 'Application not found');
    }

    const task = await prisma.applicationTask.create({
      data: {
        application_id: params.applicationId,
        created_by: params.createdBy,
        title: params.title,
        description: params.description,
        status: params.status || TaskStatus.PENDING,
        priority: params.priority || TaskPriority.MEDIUM,
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
  static async getTasks(applicationId: string) {
    const tasks = await prisma.applicationTask.findMany({
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
  static async updateTask(taskId: string, updates: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: string;
    assignedTo?: string;
    dueDate?: Date;
  }) {
    const task = await prisma.applicationTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new HttpException(404, 'Task not found');
    }

    // If status is being changed to COMPLETED, set completed_at
    const completedAt = updates.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED
      ? new Date()
      : task.completed_at;

    // If status is being changed from COMPLETED to something else, clear completed_at
    const clearedCompletedAt = task.status === TaskStatus.COMPLETED && updates.status && updates.status !== TaskStatus.COMPLETED
      ? null
      : completedAt;

    const updatedTask = await prisma.applicationTask.update({
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
  static async deleteTask(taskId: string) {
    const task = await prisma.applicationTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new HttpException(404, 'Task not found');
    }

    await prisma.applicationTask.delete({
      where: { id: taskId },
    });

    return { success: true, message: 'Task deleted successfully' };
  }

  // Get task statistics for an application
  static async getTaskStats(applicationId: string) {
    const tasks = await prisma.applicationTask.findMany({
      where: { application_id: applicationId },
      select: { status: true, priority: true },
    });

    const stats = {
      total: tasks.length,
      pending: tasks.filter((t: any) => t.status === TaskStatus.PENDING).length,
      inProgress: tasks.filter((t: any) => t.status === TaskStatus.IN_PROGRESS).length,
      completed: tasks.filter((t: any) => t.status === TaskStatus.COMPLETED).length,
      cancelled: tasks.filter((t: any) => t.status === TaskStatus.CANCELLED).length,
      byPriority: {
        low: tasks.filter((t: any) => t.priority === TaskPriority.LOW).length,
        medium: tasks.filter((t: any) => t.priority === TaskPriority.MEDIUM).length,
        high: tasks.filter((t: any) => t.priority === TaskPriority.HIGH).length,
        urgent: tasks.filter((t: any) => t.priority === TaskPriority.URGENT).length,
      },
    };

    return stats;
  }
}
