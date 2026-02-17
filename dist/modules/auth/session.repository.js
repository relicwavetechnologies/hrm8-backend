"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionRepository = exports.SessionRepository = void 0;
const repository_1 = require("../../core/repository");
class SessionRepository extends repository_1.BaseRepository {
    async create(sessionId, userId, companyId, userRole, email, expiresAt) {
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
    async findBySessionId(sessionId) {
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
    async deleteBySessionId(sessionId) {
        await this.prisma.session.delete({
            where: { session_id: sessionId },
        }).catch(() => { });
    }
    mapPrismaToSession(prismaSession) {
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
exports.SessionRepository = SessionRepository;
exports.sessionRepository = new SessionRepository();
