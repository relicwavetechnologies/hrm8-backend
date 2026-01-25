import { BaseService } from '../../core/service';
import { UserRepository } from './user.repository';
import { User, UserRole, UserStatus } from '@prisma/client';
import { hashPassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';
import { HttpException } from '../../core/http-exception';

export class UserService extends BaseService {
  constructor(private userRepository: UserRepository) {
    super();
  }

  async createUser(
    companyId: string,
    creatorId: string,
    data: { email: string; name: string; role: any; password?: string }
  ): Promise<User> {
    const email = normalizeEmail(data.email);

    // Check if email already exists
    const exists = await this.userRepository.countByEmail(email);
    if (exists > 0) {
      throw new HttpException(409, 'User with this email already exists');
    }

    const passwordHash = await hashPassword(data.password || 'Temporary123!'); // Default temp password or generate random

    return this.userRepository.create({
      email,
      name: data.name,
      role: data.role,
      password_hash: passwordHash,
      status: 'PENDING_VERIFICATION',
      company: { connect: { id: companyId } },
      role_assigner: { connect: { id: creatorId } },
    });
  }

  async updateUser(id: string, data: any) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new HttpException(404, 'User not found');

    if (data.email) {
      data.email = normalizeEmail(data.email);
      const exists = await this.userRepository.countByEmail(data.email, id);
      if (exists > 0) throw new HttpException(409, 'Email already in use');
    }

    if (data.password) {
      data.password_hash = await hashPassword(data.password);
      delete data.password;
    }

    return this.userRepository.update(id, data);
  }

  async deleteUser(id: string) {
    return this.userRepository.delete(id);
  }

  async getUser(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new HttpException(404, 'User not found');
    return user;
  }

  async getUsersByCompany(companyId: string) {
    return this.userRepository.findByCompanyId(companyId);
  }

  // --- Notification Preferences ---

  async getNotificationPreferences(userId: string) {
    const prefs = await this.userRepository.getNotificationPreferences(userId);

    // Default preferences structure matches frontend expectations
    const defaultEventPrefs = {
      new_application: { enabled: true, channels: ['email', 'in-app'] },
      application_status_change: { enabled: true, channels: ['email', 'in-app'] },
      interview_scheduled: { enabled: true, channels: ['email', 'in-app'] },
      job_posted: { enabled: true, channels: ['email', 'in-app'] },
      payment_received: { enabled: true, channels: ['email', 'in-app'] },
      payment_failed: { enabled: true, channels: ['email', 'in-app'] },
      subscription_change: { enabled: true, channels: ['email', 'in-app'] },
      system_announcement: { enabled: true, channels: ['email', 'in-app'] },
      user_signup: { enabled: true, channels: ['email', 'in-app'] },
      support_ticket: { enabled: true, channels: ['email', 'in-app'] },
    };

    const defaultQuietHours = { enabled: false, start: '22:00', end: '08:00' };

    if (!prefs) {
      // Return defaults mapped to camelCase for API
      return {
        userId,
        eventPreferences: defaultEventPrefs,
        quietHours: defaultQuietHours,
      };
    }

    // Map DB snake_case to API camelCase
    return {
      userId: prefs.user_id,
      eventPreferences: prefs.event_preferences || defaultEventPrefs,
      quietHours: prefs.quiet_hours || defaultQuietHours,
    };
  }

  async updateNotificationPreferences(userId: string, data: any) {
    // Map API camelCase to DB snake_case
    const dbData: any = {};
    if (data.eventPreferences) dbData.event_preferences = data.eventPreferences;
    if (data.quietHours) dbData.quiet_hours = data.quietHours;

    const prefs = await this.userRepository.updateNotificationPreferences(userId, {
      ...dbData,
      user: { connect: { id: userId } }
    });

    return {
      userId: prefs.user_id,
      eventPreferences: prefs.event_preferences,
      quietHours: prefs.quiet_hours,
    };
  }

  // --- Alert Rules ---

  async getAlertRules(userId: string) {
    return this.userRepository.getAlertRules(userId);
  }

  async createAlertRule(userId: string, data: any) {
    return this.userRepository.createAlertRule({
      ...data,
      user: { connect: { id: userId } }
    });
  }

  async updateAlertRule(id: string, data: any) {
    return this.userRepository.updateAlertRule(id, data);
  }

  async deleteAlertRule(id: string) {
    return this.userRepository.deleteAlertRule(id);
  }
}
