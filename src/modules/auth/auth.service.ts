import { BaseService } from '../../core/service';
import { AuthRepository } from './auth.repository';
import { User, UserRole, UserStatus } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';
import { HttpException } from '../../core/http-exception';
import { generateSessionId, getSessionExpiration } from '../../utils/session';

export class AuthService extends BaseService {
  constructor(private authRepository: AuthRepository) {
    super();
  }

  async login(data: { email: string; password: string }) {
    const user = await this.authRepository.findByEmail(normalizeEmail(data.email));
    
    if (!user) {
      throw new HttpException(401, 'Invalid credentials');
    }

    const isValid = await comparePassword(data.password, user.password_hash);
    if (!isValid) {
      throw new HttpException(401, 'Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new HttpException(403, `Account status: ${user.status}`);
    }

    // Update last login
    await this.authRepository.updateLastLogin(user.id);

    // Create session
    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiration();

    await this.authRepository.createSession({
      session_id: sessionId,
      user: { connect: { id: user.id } },
      email: user.email,
      expires_at: expiresAt,
      company_id: user.company_id,
      user_role: user.role
    });

    return { user, sessionId };
  }

  async createSessionForUser(user: User) {
    await this.authRepository.updateLastLogin(user.id);

    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiration();

    await this.authRepository.createSession({
      session_id: sessionId,
      user: { connect: { id: user.id } },
      email: user.email,
      expires_at: expiresAt,
      company_id: user.company_id,
      user_role: user.role
    });

    return { user, sessionId };
  }

  async logout(sessionId: string) {
    await this.authRepository.deleteSession(sessionId);
  }

  async registerCompanyAdmin(
    companyId: string,
    email: string,
    name: string,
    password: string,
    activate: boolean = false
  ): Promise<User> {
    const passwordHash = await hashPassword(password);

    return this.authRepository.create({
      email: normalizeEmail(email),
      name: name.trim(),
      password_hash: passwordHash,
      company: { connect: { id: companyId } },
      role: 'ADMIN', // Using string literal matching Prisma enum if needed, or import UserRole
      status: activate ? 'ACTIVE' : 'PENDING_VERIFICATION',
    });
  }

  async registerEmployee(
    companyId: string,
    email: string,
    name: string,
    password: string
  ): Promise<User> {
    const passwordHash = await hashPassword(password);

    return this.authRepository.create({
      email: normalizeEmail(email),
      name: name.trim(),
      password_hash: passwordHash,
      company: { connect: { id: companyId } },
      role: 'USER',
      status: 'ACTIVE',
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new HttpException(404, 'User not found');
    return user;
  }
}
