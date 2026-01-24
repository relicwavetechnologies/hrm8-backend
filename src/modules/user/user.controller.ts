import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { AuthenticatedRequest } from '../../types';

export class UserController extends BaseController {
  private userService: UserService;

  constructor() {
    super();
    this.userService = new UserService(new UserRepository());
  }

  // User Management
  getUsers = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const users = await this.userService.getUsersByCompany(req.user.companyId);
      // Filter sensitive data
      const safeUsers = users.map(u => {
        const { password_hash, ...rest } = u;
        return rest;
      });
      return this.sendSuccess(res, { users: safeUsers });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const user = await this.userService.getUser(id);
      const { password_hash, ...safeUser } = user;
      return this.sendSuccess(res, { user: safeUser });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const user = await this.userService.createUser(
        req.user.companyId,
        req.user.id,
        req.body
      );
      const { password_hash, ...safeUser } = user;
      return this.sendSuccess(res, { user: safeUser });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const user = await this.userService.updateUser(id, req.body);
      const { password_hash, ...safeUser } = user;
      return this.sendSuccess(res, { user: safeUser });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      await this.userService.deleteUser(id);
      return this.sendSuccess(res, { message: 'User deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Notification Preferences
  getNotificationPreferences = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const preferences = await this.userService.getNotificationPreferences(req.user.id);
      return this.sendSuccess(res, { preferences });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateNotificationPreferences = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const preferences = await this.userService.updateNotificationPreferences(req.user.id, req.body);
      return this.sendSuccess(res, { preferences });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Alert Rules
  getAlertRules = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const rules = await this.userService.getAlertRules(req.user.id);
      return this.sendSuccess(res, { rules });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createAlertRule = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const rule = await this.userService.createAlertRule(req.user.id, req.body);
      return this.sendSuccess(res, { rule });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateAlertRule = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const rule = await this.userService.updateAlertRule(id, req.body);
      return this.sendSuccess(res, { rule });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  deleteAlertRule = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      await this.userService.deleteAlertRule(id);
      return this.sendSuccess(res, { message: 'Alert rule deleted successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
