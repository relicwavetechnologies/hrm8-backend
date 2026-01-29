import { BaseRepository } from '../../core/repository';
import { InvitationStatus, UserRole } from '../../types';

export class EmployeeRepository extends BaseRepository {
  /**
   * Find all users in a company
   */
  async findCompanyUsers(companyId: string) {
    return this.prisma.user.findMany({
      where: {
        company_id: companyId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        assigned_by: true,
        created_at: true,
        last_login_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Find pending invitations for a company
   */
  async findPendingInvitations(companyId: string) {
    return this.prisma.invitation.findMany({
      where: {
        company_id: companyId,
        status: InvitationStatus.PENDING,
      },
      select: {
        id: true,
        email: true,
        token: true,
        status: true,
        expires_at: true,
        created_at: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Create multiple invitations
   */
  async createInvitations(
    invitations: Array<{
      companyId: string;
      invitedBy: string;
      email: string;
      token: string;
      expiresAt: Date;
    }>
  ) {
    return this.prisma.invitation.createMany({
      data: invitations.map((inv) => ({
        company_id: inv.companyId,
        invited_by: inv.invitedBy,
        email: inv.email,
        token: inv.token,
        status: InvitationStatus.PENDING,
        expires_at: inv.expiresAt,
      })),
    });
  }

  /**
   * Create a single invitation
   */
  async createInvitation(data: {
    companyId: string;
    invitedBy: string;
    email: string;
    token: string;
    expiresAt: Date;
  }) {
    return this.prisma.invitation.create({
      data: {
        company_id: data.companyId,
        invited_by: data.invitedBy,
        email: data.email,
        token: data.token,
        status: InvitationStatus.PENDING,
        expires_at: data.expiresAt,
      },
    });
  }

  /**
   * Check if a pending invitation exists for an email and company
   */
  async hasPendingInvitation(email: string, companyId: string): Promise<boolean> {
    const count = await this.prisma.invitation.count({
      where: {
        email,
        company_id: companyId,
        status: InvitationStatus.PENDING,
      },
    });
    return count > 0;
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Cancel an invitation (update status to CANCELLED)
   */
  async cancelInvitation(invitationId: string, companyId: string) {
    return this.prisma.invitation.updateMany({
      where: {
        id: invitationId,
        company_id: companyId,
      },
      data: {
        status: InvitationStatus.CANCELLED,
      },
    });
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, companyId: string, role: UserRole, assignedBy: string) {
    return this.prisma.user.updateMany({
      where: {
        id: userId,
        company_id: companyId,
      },
      data: {
        role,
        assigned_by: assignedBy,
      },
    });
  }

  /**
   * Find user in company
   */
  async findUserInCompany(userId: string, companyId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        company_id: companyId,
      },
    });
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Count super admins in a company
   */
  async countSuperAdmins(companyId: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        company_id: companyId,
        role: UserRole.SUPER_ADMIN,
      },
    });
  }

  /**
   * Find company name by ID
   */
  async findCompanyName(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    return company?.name;
  }

  /**
   * Find invitation by token
   */
  async findInvitationByToken(token: string) {
    return this.prisma.invitation.findUnique({
      where: { token },
    });
  }

  /**
   * Accept invitation (mark as accepted)
   */
  async acceptInvitation(invitationId: string) {
    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.ACCEPTED,
      },
    });
  }
}
