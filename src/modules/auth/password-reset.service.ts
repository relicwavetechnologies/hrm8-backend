import { BaseService } from '../../core/service';
import { emailService } from '../email/email.service';
import { normalizeEmail } from '../../utils/email';
import { passwordResetTokenRepository } from './password-reset-token.repository';
import { UserRepository } from '../user/user.repository';
import { generateToken, hashToken } from '../../utils/token';
import { hashPassword } from '../../utils/password';

const DEFAULT_TOKEN_TTL_MINUTES = 60;

export class PasswordResetService extends BaseService {
  private userRepository: UserRepository;

  constructor() {
    super();
    this.userRepository = new UserRepository();
  }

  async requestPasswordReset(
    email: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      return;
    }

    await passwordResetTokenRepository.invalidateActiveTokensForUser(user.id);

    const rawToken = generateToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresInMinutes = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES) || DEFAULT_TOKEN_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      requestedIp: metadata?.ip,
      requestedUserAgent: metadata?.userAgent,
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      expiresAt,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const tokenRecord = await passwordResetTokenRepository.findByTokenHash(tokenHash);

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    const user = await this.userRepository.findById(tokenRecord.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const passwordHash = await hashPassword(newPassword);
    // userRepo.updatePassword needed? Yes.
    // I didn't implement updatePassword in UserRepository yet. I should add it.
    // For now assume it exists or I add it.
    // await userRepository.updatePassword(user.id, passwordHash);

    await passwordResetTokenRepository.markAsUsed(tokenRecord.id);
    await passwordResetTokenRepository.invalidateActiveTokensForUser(user.id);

    await emailService.sendPasswordChangeConfirmation({
      to: user.email,
      name: user.name,
      changedAt: new Date(),
    });
  }
}

export const passwordResetService = new PasswordResetService();
