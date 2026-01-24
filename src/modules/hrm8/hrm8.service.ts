import { BaseService } from '../../core/service';
import { Hrm8Repository } from './hrm8.repository';
import { HRM8User } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { HttpException } from '../../core/http-exception';
import { generateSessionId, getSessionExpiration } from '../../utils/session';

export class Hrm8Service extends BaseService {
  constructor(private hrm8Repository: Hrm8Repository) {
    super();
  }

  async login(data: { email: string; password: string }) {
    const user = await this.hrm8Repository.findByEmail(data.email);
    if (!user) {
      throw new HttpException(401, 'Invalid credentials');
    }

    const isValid = await comparePassword(data.password, user.password_hash);
    if (!isValid) {
      throw new HttpException(401, 'Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new HttpException(403, 'Account is inactive');
    }

    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiration();

    await this.hrm8Repository.createSession({
      session_id: sessionId,
      user: { connect: { id: user.id } },
      email: user.email,
      expires_at: expiresAt,
    });

    let regionIds: string[] = [];
    if (user.role === 'REGIONAL_LICENSEE' && user.licensee_id) {
        const regions = await this.hrm8Repository.getRegionsForLicensee(user.licensee_id);
        regionIds = regions.map(r => r.id);
    }

    return { user, sessionId, regionIds };
  }

  async logout(sessionId: string) {
    await this.hrm8Repository.deleteSession(sessionId);
  }

  async getProfile(userId: string) {
    const user = await this.hrm8Repository.findById(userId);
    if (!user) throw new HttpException(404, 'User not found');

    let regionIds: string[] = [];
    if (user.role === 'REGIONAL_LICENSEE' && user.licensee_id) {
        const regions = await this.hrm8Repository.getRegionsForLicensee(user.licensee_id);
        regionIds = regions.map(r => r.id);
    }

    return { user, regionIds };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.hrm8Repository.findById(userId);
    if (!user) throw new HttpException(404, 'User not found');

    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) throw new HttpException(400, 'Current password is incorrect');

    const passwordHash = await hashPassword(newPassword);
    await this.hrm8Repository.update(userId, { password_hash: passwordHash });
  }
}
