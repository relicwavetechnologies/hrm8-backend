"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultantRepository = void 0;
const repository_1 = require("../../core/repository");
class ConsultantRepository extends repository_1.BaseRepository {
    async findByEmail(email) {
        return this.prisma.consultant.findUnique({
            where: { email },
        });
    }
    async findById(id) {
        return this.prisma.consultant.findUnique({
            where: { id },
        });
    }
    async update(id, data) {
        return this.prisma.consultant.update({
            where: { id },
            data,
        });
    }
    async updateLastLogin(id) {
        return this.prisma.consultant.update({
            where: { id },
            data: { last_login_at: new Date() },
        });
    }
    // Jobs
    async findAssignedJobs(consultantId, filters) {
        const where = { consultant_id: consultantId };
        if (filters?.status)
            where.status = filters.status;
        return this.prisma.consultantJobAssignment.findMany({
            where,
            include: {
                job: true
            },
            orderBy: { assigned_at: 'desc' }
        });
    }
    async findJobAssignment(consultantId, jobId) {
        return this.prisma.consultantJobAssignment.findUnique({
            where: {
                consultant_id_job_id: {
                    consultant_id: consultantId,
                    job_id: jobId
                }
            }
        });
    }
    // Commissions
    async findCommissions(consultantId, filters) {
        const where = { consultant_id: consultantId };
        if (filters?.status)
            where.status = filters.status;
        return this.prisma.commission.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });
    }
    // Session
    async createSession(data) {
        return this.prisma.consultantSession.create({
            data,
        });
    }
    async findSessionBySessionId(sessionId) {
        return this.prisma.consultantSession.findUnique({
            where: { session_id: sessionId },
            include: { consultant: true },
        });
    }
    async deleteSession(sessionId) {
        return this.prisma.consultantSession.delete({
            where: { session_id: sessionId },
        });
    }
}
exports.ConsultantRepository = ConsultantRepository;
