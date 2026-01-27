import { BaseService } from '../../core/service';
import { EmployeeRepository } from './employee.repository';
import { HttpException } from '../../core/http-exception';
import { EmployeeInvitationRequest, UserRole } from '../../types';
import { emailService } from '../email/email.service';
import { env } from '../../config/env';
import crypto from 'crypto';

export class EmployeeService extends BaseService {
  constructor(private employeeRepository: EmployeeRepository) {
    super();
  }

  /**
   * Get all users in a company
   */
  async getCompanyUsers(companyId: string) {
    const users = await this.employeeRepository.findCompanyUsers(companyId);
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      assignedBy: user.assigned_by,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    }));
  }

  /**
   * Get pending invitations for a company
   */
  async getPendingInvitations(companyId: string) {
    const invitations = await this.employeeRepository.findPendingInvitations(companyId);
    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      token: inv.token,
      status: inv.status,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
      invitedBy: {
        id: inv.inviter.id,
        name: inv.inviter.name,
        email: inv.inviter.email,
      },
    }));
  }

  /**
   * Invite employees to company
   * Validates emails, creates invitations, and sends invitation emails
   */
  async inviteEmployees(
    request: EmployeeInvitationRequest,
    companyId: string,
    invitedBy: string
  ): Promise<{
    sent: string[];
    failed: Array<{ email: string; reason: string }>;
  }> {
    const sent: string[] = [];
    const failed: Array<{ email: string; reason: string }> = [];

    for (const email of request.emails) {
      try {
        const normalizedEmail = email.toLowerCase().trim();

        // Validate email format
        if (!this.isValidEmail(normalizedEmail)) {
          failed.push({ email, reason: 'Invalid email format' });
          continue;
        }

        // Check if user already exists
        const existingUser = await this.employeeRepository.findUserByEmail(normalizedEmail);
        if (existingUser) {
          failed.push({ email, reason: 'User already exists' });
          continue;
        }

        // Check for existing pending invitation
        const hasPending = await this.employeeRepository.hasPendingInvitation(
          normalizedEmail,
          companyId
        );
        if (hasPending) {
          failed.push({ email, reason: 'Invitation already sent' });
          continue;
        }

        // Generate invitation token
        const token = this.generateInvitationToken();

        // Set expiration (7 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invitation
        await this.employeeRepository.createInvitation({
          companyId,
          invitedBy,
          email: normalizedEmail,
          token,
          expiresAt,
        });

        // Send invitation email
        try {
          await this.sendInvitationEmail(normalizedEmail, token, companyId);
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Don't fail the invitation creation if email fails
        }

        sent.push(normalizedEmail);
      } catch (error) {
        failed.push({
          email,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { sent, failed };
  }

  /**
   * Cancel an invitation
   * Only admins can cancel invitations
   */
  async cancelInvitation(invitationId: string, companyId: string, userId: string) {
    // Verify the user has permission (should be admin)
    const user = await this.employeeRepository.findUserById(userId);
    if (!user) {
      throw new HttpException(404, 'User not found');
    }

    if (!this.isAdminOrAbove(user.role)) {
      throw new HttpException(403, 'Only admins can cancel invitations');
    }

    // Cancel the invitation
    const result = await this.employeeRepository.cancelInvitation(invitationId, companyId);

    if (result.count === 0) {
      throw new HttpException(404, 'Invitation not found');
    }

    return { message: 'Invitation cancelled successfully' };
  }

  /**
   * Update user role
   * Validates role hierarchy and permissions
   */
  async updateUserRole(
    targetUserId: string,
    newRole: UserRole,
    companyId: string,
    requestingUserId: string
  ) {
    // Get the requesting user
    const requestingUser = await this.employeeRepository.findUserById(requestingUserId);
    if (!requestingUser) {
      throw new HttpException(404, 'Requesting user not found');
    }

    // Get the target user
    const targetUser = await this.employeeRepository.findUserInCompany(targetUserId, companyId);
    if (!targetUser) {
      throw new HttpException(404, 'Target user not found');
    }

    // Validate the requesting user is in the same company
    if (requestingUser.company_id !== companyId) {
      throw new HttpException(403, 'You do not have permission to update users in this company');
    }

    // Prevent self-assignment
    if (targetUserId === requestingUserId) {
      throw new HttpException(400, 'You cannot assign a role to yourself');
    }

    // Check if requesting user can assign this role
    if (!this.canUserAssignRole(requestingUser.role, newRole)) {
      throw new HttpException(
        403,
        `You do not have permission to assign the role ${newRole}`
      );
    }

    // Prevent demoting the last SUPER_ADMIN
    if (targetUser.role === UserRole.SUPER_ADMIN && newRole !== UserRole.SUPER_ADMIN) {
      const superAdminCount = await this.employeeRepository.countSuperAdmins(companyId);
      if (superAdminCount === 1) {
        throw new HttpException(
          400,
          'Cannot demote the last super administrator. Please assign another super administrator first.'
        );
      }
    }

    // Update the role
    await this.employeeRepository.updateUserRole(
      targetUserId,
      companyId,
      newRole,
      requestingUserId
    );

    // Get updated user
    const updatedUser = await this.employeeRepository.findUserById(targetUserId);
    if (!updatedUser) {
      throw new HttpException(404, 'User not found after update');
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      assignedBy: updatedUser.assigned_by,
    };
  }

  /**
   * Check if a user can assign a specific role
   * SUPER_ADMIN can assign ADMIN, USER, VISITOR
   * ADMIN can assign USER, VISITOR
   */
  private canUserAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
    if (assignerRole === UserRole.SUPER_ADMIN) {
      return ([UserRole.ADMIN, UserRole.USER, UserRole.VISITOR] as UserRole[]).includes(targetRole);
    }

    if (assignerRole === UserRole.ADMIN) {
      return ([UserRole.USER, UserRole.VISITOR] as UserRole[]).includes(targetRole);
    }

    return false;
  }

  /**
   * Check if role is admin or above
   */
  private isAdminOrAbove(role: UserRole): boolean {
    return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate a secure invitation token
   */
  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(email: string, token: string, companyId: string) {
    const baseUrl = env.FRONTEND_URL || 'http://localhost:3000';
    const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;

    // Get company name
    const companyName = (await this.employeeRepository.findCompanyName(companyId)) || 'the company';

    // Send email using email service
    const html = `
      <p>Hello,</p>
      <p>You have been invited to join <strong>${companyName}</strong> on HRM8.</p>
      <p>Please click the link below to accept the invitation and set up your account:</p>
      <p><a href="${invitationUrl}">${invitationUrl}</a></p>
      <p>This invitation will expire in 7 days.</p>
      <p>Best regards,<br/>The HRM8 Team</p>
    `;

    // Use the private sendEmail method if available, otherwise use a custom implementation
    await emailService['sendEmail'](email, `Invitation to join ${companyName}`, html);
  }
}
