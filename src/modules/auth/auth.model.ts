import { UserRole } from '../../types';

export interface SessionData {
  id: string;
  sessionId: string;
  userId: string;
  companyId: string;
  userRole: UserRole;
  email: string;
  name: string;
  expiresAt: Date;
  lastActivity: Date;
  createdAt: Date;
}
