"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignupRequestRepository = void 0;
const repository_1 = require("../../core/repository");
class SignupRequestRepository extends repository_1.BaseRepository {
    async findMany(where) {
        return this.prisma.signupRequest.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
    }
    async findById(id) {
        return this.prisma.signupRequest.findUnique({
            where: { id },
        });
    }
    async update(id, data) {
        return this.prisma.signupRequest.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        return this.prisma.signupRequest.delete({
            where: { id },
        });
    }
}
exports.SignupRequestRepository = SignupRequestRepository;
