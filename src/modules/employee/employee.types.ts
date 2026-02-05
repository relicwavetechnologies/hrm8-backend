/**
 * Employee Module Types
 */
import { UserRole } from '../../types';

export interface EmployeeInvitationRequest {
  emails: string[];
}

export interface CompanyUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: string;
  assignedBy: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface UpdateRoleRequest {
  role: UserRole;
}
