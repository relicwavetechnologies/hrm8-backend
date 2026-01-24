import type { Prisma, User } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class AuthRepository extends BaseRepository {
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { last_login_at: new Date() },
    });
  }

  // Session Management
  async createSession(data: Prisma.SessionCreateInput) {
    return this.prisma.session.create({
      data,
    });
  }

  async findSessionBySessionId(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { session_id: sessionId },
      include: { user: true },
    });
  }

  async deleteSession(sessionId: string) {
    return this.prisma.session.delete({
      where: { session_id: sessionId },
    });
  }

  // Password Reset
  async createPasswordResetToken(data: Prisma.PasswordResetTokenCreateInput) {
    return this.prisma.passwordResetToken.create({
      data,
    });
  }

  async findPasswordResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });
  }

  async markPasswordResetTokenUsed(id: string) {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { used_at: new Date() },
    });
  }
}
