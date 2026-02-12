import { BaseRepository } from '../../core/repository';
import { UserRole } from '../../types';
import { SessionData } from './auth.model';

export class SessionRepository extends BaseRepository {
  async create(
    sessionId: string,
    userId: string,
    companyId: string,
    userRole: UserRole,
    email: string,
    expiresAt: Date
  ): Promise<SessionData> {
    const session = await this.prisma.session.create({
      data: {
        session_id: sessionId,
        user_id: userId,
        company_id: companyId,
        user_role: userRole,
        email,
        expires_at: expiresAt,
        last_activity: new Date(),
      },
      include: { user: { select: { name: true } } },
    });

    return this.mapPrismaToSession(session);
  }

  async findBySessionId(sessionId: string): Promise<SessionData | null> {
    // console.log(`[SessionRepository.findBySessionId] Looking up session: ${sessionId}`);

    const session = await this.prisma.session.findUnique({
      where: { session_id: sessionId },
      include: { user: { select: { name: true } } },
    });

    if (!session) {
      // console.log(`[SessionRepository.findBySessionId] Session not found for: ${sessionId}`);
      return null;
    }

    if (new Date() > session.expires_at) {
      // console.log(`[SessionRepository.findBySessionId] Session expired for: ${sessionId}`);
      await this.deleteBySessionId(sessionId);
      return null;
    }

    // console.log(`[SessionRepository.findBySessionId] Session found for user: ${session.user_id}`);
    return this.mapPrismaToSession(session);
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.prisma.session.delete({
      where: { session_id: sessionId },
    }).catch(() => { });
  }

  private mapPrismaToSession(prismaSession: any): SessionData {
    return {
      id: prismaSession.id,
      sessionId: prismaSession.session_id,
      userId: prismaSession.user_id,
      companyId: prismaSession.company_id,
      userRole: prismaSession.user_role,
      email: prismaSession.email,
      name: prismaSession.user?.name || '',
      expiresAt: prismaSession.expires_at,
      lastActivity: prismaSession.last_activity,
      createdAt: prismaSession.created_at,
    };
  }
}

export const sessionRepository = new SessionRepository();
