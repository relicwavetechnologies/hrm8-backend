import { BaseRepository } from '../../core/repository';

export class PasswordResetTokenRepository extends BaseRepository {
  async invalidateActiveTokensForUser(userId: string) {
    // Stub
  }
  
  async create(data: any) {
    // Stub
  }

  async findByTokenHash(hash: string): Promise<any> {
    // Stub
    return null;
  }

  async markAsUsed(id: string) {
    // Stub
  }
}

export const passwordResetTokenRepository = new PasswordResetTokenRepository();
