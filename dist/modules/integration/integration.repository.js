"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationRepository = void 0;
const repository_1 = require("../../core/repository");
class IntegrationRepository extends repository_1.BaseRepository {
    async create(data) {
        return this.prisma.integration.create({ data });
    }
    async update(id, data) {
        return this.prisma.integration.update({
            where: { id },
            data,
        });
    }
    async findById(id) {
        return this.prisma.integration.findUnique({
            where: { id },
        });
    }
    async findByCompanyAndType(companyId, type) {
        return this.prisma.integration.findFirst({
            where: { company_id: companyId, type },
        });
    }
    async findAllByCompany(companyId) {
        return this.prisma.integration.findMany({
            where: { company_id: companyId },
        });
    }
    async delete(id) {
        return this.prisma.integration.delete({
            where: { id },
        });
    }
}
exports.IntegrationRepository = IntegrationRepository;
