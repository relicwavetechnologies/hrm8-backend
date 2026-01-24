import type { Prisma, User, UserNotificationPreferences, UserAlertRule } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class UserRepository extends BaseRepository {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByCompanyId(companyId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByCompanyIdAndRole(companyId: string, role: any): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        company_id: companyId,
        role,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async countByEmail(email: string, excludeId?: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        email: email,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
  }

  // Notification Preferences
  async getNotificationPreferences(userId: string): Promise<UserNotificationPreferences | null> {
    return this.prisma.userNotificationPreferences.findUnique({
      where: { user_id: userId },
    });
  }

  async updateNotificationPreferences(
    userId: string, 
    data: Prisma.UserNotificationPreferencesCreateInput
  ): Promise<UserNotificationPreferences> {
    return this.prisma.userNotificationPreferences.upsert({
      where: { user_id: userId },
      create: data,
      update: data,
    });
  }

  // Alert Rules
  async getAlertRules(userId: string): Promise<UserAlertRule[]> {
    return this.prisma.userAlertRule.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createAlertRule(data: Prisma.UserAlertRuleCreateInput): Promise<UserAlertRule> {
    return this.prisma.userAlertRule.create({ data });
  }

  async updateAlertRule(id: string, data: Prisma.UserAlertRuleUpdateInput): Promise<UserAlertRule> {
    return this.prisma.userAlertRule.update({
      where: { id },
      data,
    });
  }

  async deleteAlertRule(id: string): Promise<UserAlertRule> {
    return this.prisma.userAlertRule.delete({ where: { id } });
  }
}
