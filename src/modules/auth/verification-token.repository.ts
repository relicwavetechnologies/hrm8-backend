import type { VerificationToken } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class VerificationTokenRepository extends BaseRepository {
  /**
   * Create a new verification token
   */
  async create(data: {
    companyId: string;
    email: string;
    token: string;
    expiresAt: Date;
  }): Promise<VerificationToken> {
    return this.prisma.verificationToken.create({
      data: {
        company_id: data.companyId,
        email: data.email,
        token: data.token,
        expires_at: data.expiresAt,
      },
    });
  }

  /**
   * Find a verification token by token string
   */
  async findByToken(token: string): Promise<VerificationToken | null> {
    return this.prisma.verificationToken.findUnique({
      where: { token },
    });
  }

  /**
   * Mark a verification token as used
   */
  async markAsUsed(id: string): Promise<VerificationToken> {
    return this.prisma.verificationToken.update({
      where: { id },
      data: {
        used_at: new Date(),
      },
    });
  }

  /**
   * Check if a token is valid (not expired and not used)
   */
  async isValidToken(token: string): Promise<boolean> {
    const tokenRecord = await this.findByToken(token);

    if (!tokenRecord) {
      return false;
    }

    // Check if token has been used
    if (tokenRecord.used_at) {
      return false;
    }

    // Check if token has expired
    if (tokenRecord.expires_at < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Find all tokens for a company
   */
  async findByCompanyId(companyId: string): Promise<VerificationToken[]> {
    return this.prisma.verificationToken.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Delete expired tokens (cleanup utility)
   */
  async deleteExpiredTokens(): Promise<number> {
    const result = await this.prisma.verificationToken.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}

export const verificationTokenRepository = new VerificationTokenRepository();
