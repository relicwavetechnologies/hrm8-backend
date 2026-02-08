import { BaseRepository } from '../../core/repository';

export class PasswordResetTokenRepository extends BaseRepository {
  async invalidateActiveTokensForUser(userId: string) {
    return this.prisma.passwordResetToken.updateMany({
      where: {
        user_id: userId,
        used_at: null,
        expires_at: { gt: new Date() },
      },
      data: { used_at: new Date() },
    });
  }
  
  async create(data: any) {
    return this.prisma.passwordResetToken.create({ data });
  }

  async findByTokenHash(hash: string): Promise<any> {
    return this.prisma.passwordResetToken.findUnique({
      where: { token_hash: hash },
    });
  }

  async markAsUsed(id: string) {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { used_at: new Date() },
    });
  }
}

export const passwordResetTokenRepository = new PasswordResetTokenRepository();
