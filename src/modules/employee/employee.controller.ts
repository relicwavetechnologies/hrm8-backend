import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { EmployeeService } from './employee.service';
import { EmployeeRepository } from './employee.repository';
import { AuthenticatedRequest } from '../../types';
import { EmployeeInvitationRequest, UpdateRoleRequest } from './employee.types';

export class EmployeeController extends BaseController {
  private employeeService: EmployeeService;

  constructor() {
    super('employee');
    this.employeeService = new EmployeeService(new EmployeeRepository());
  }

  /**
   * Get all users in company
   * GET /api/employees
   */
  getCompanyUsers = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Unauthorized'), 401);
      }

      const users = await this.employeeService.getCompanyUsers(req.user.companyId as string);
      return this.sendSuccess(res, users);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Invite employees to company
   * POST /api/employees/invite
   */
  inviteEmployees = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Unauthorized'), 401);
      }

      const invitationData: EmployeeInvitationRequest = req.body;

      // Validate request body
      if (!invitationData.emails || !Array.isArray(invitationData.emails)) {
        return this.sendError(res, new Error('Invalid request: emails array required'), 400);
      }

      if (invitationData.emails.length === 0) {
        return this.sendError(res, new Error('At least one email address is required'), 400);
      }

      const result = await this.employeeService.inviteEmployees(
        invitationData,
        req.user.companyId as string,
        req.user.id
      );

      return this.sendSuccess(res, result, 'Invitations processed');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Get pending invitations for company
   * GET /api/employees/invitations
   */
  getInvitations = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Unauthorized'), 401);
      }

      const invitations = await this.employeeService.getPendingInvitations(req.user.companyId as string);
      return this.sendSuccess(res, invitations);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Cancel an invitation
   * DELETE /api/employees/invitations/:id
   */
  cancelInvitation = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Unauthorized'), 401);
      }

      const { id } = req.params;

      if (!id) {
        return this.sendError(res, new Error('Invitation ID is required'), 400);
      }

      const result = await this.employeeService.cancelInvitation(
        id as string,
        req.user.companyId as string,
        req.user.id
      );

      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Update user role
   * PUT /api/employees/:id/role
   */
  updateUserRole = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, new Error('Unauthorized'), 401);
      }

      const { id } = req.params;
      const { role }: UpdateRoleRequest = req.body;

      if (!id) {
        return this.sendError(res, new Error('User ID is required'), 400);
      }

      if (!role) {
        return this.sendError(res, new Error('Role is required'), 400);
      }

      const updatedUser = await this.employeeService.updateUserRole(
        id as string,
        role,
        req.user.companyId as string,
        req.user.id
      );

      return this.sendSuccess(res, { user: updatedUser }, 'User role updated successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
