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
    return this.userRepository.getNotificationPreferences(userId);
  }

  async updateNotificationPreferences(userId: string, data: any) {
    // Ensure user_id is set for create
    return this.userRepository.updateNotificationPreferences(userId, {
      ...data,
      user: { connect: { id: userId } }
    });
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
