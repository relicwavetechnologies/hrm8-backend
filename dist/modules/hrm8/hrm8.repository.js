"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hrm8Repository = void 0;
const repository_1 = require("../../core/repository");
class Hrm8Repository extends repository_1.BaseRepository {
    async findByEmail(email) {
        return this.prisma.hRM8User.findUnique({
            where: { email },
        });
    }
    async findById(id) {
        return this.prisma.hRM8User.findUnique({
            where: { id },
        });
    }
    async create(data) {
        return this.prisma.hRM8User.create({
            data,
        });
    }
    async update(id, data) {
        return this.prisma.hRM8User.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        return this.prisma.hRM8User.delete({
            where: { id },
        });
    }
    // Session Methods
    async createSession(data) {
        return this.prisma.hRM8Session.create({
            data,
        });
    }
    async findSessionBySessionId(sessionId) {
        const session = await this.prisma.hRM8Session.findUnique({
            where: { session_id: sessionId },
            include: { user: true },
        });
        /*
        if (!session) {
          console.log(`[Hrm8Repository.findSessionBySessionId] Session not found for: ${sessionId}`);
        } else {
          console.log(`[Hrm8Repository.findSessionBySessionId] Session found for user: ${session.hrm8_user_id}, user object exists: ${!!session.user}`);
        }
        */
        return session;
    }
    async deleteSession(sessionId) {
        return this.prisma.hRM8Session.delete({
            where: { session_id: sessionId },
        });
    }
    // Licensee & Regions
    async getRegionsForLicensee(licenseeId) {
        return this.prisma.region.findMany({
            where: { licensee_id: licenseeId },
        });
    }
    async findLicenseeById(licenseeId) {
        return this.prisma.regionalLicensee.findUnique({
            where: { id: licenseeId },
            include: {
                regions: {
                    orderBy: [{ country: 'asc' }, { name: 'asc' }],
                },
            },
        });
    }
    async updateLicensee(licenseeId, data) {
        return this.prisma.regionalLicensee.update({
            where: { id: licenseeId },
            data,
            include: {
                regions: {
                    orderBy: [{ country: 'asc' }, { name: 'asc' }],
                },
            },
        });
    }
}
exports.Hrm8Repository = Hrm8Repository;
