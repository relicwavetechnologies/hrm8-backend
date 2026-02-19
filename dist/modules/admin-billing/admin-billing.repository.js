"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminBillingRepository = void 0;
const repository_1 = require("../../core/repository");
class AdminBillingRepository extends repository_1.BaseRepository {
    // --- Commissions ---
    async findCommissions(filters, limit, offset) {
        return this.prisma.commission.findMany({
            where: filters,
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset,
            include: {
                consultant: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            }
        });
    }
    async findCommissionsByConsultant(consultantId) {
        return this.prisma.commission.findMany({
            where: { consultant_id: consultantId },
            orderBy: { created_at: 'desc' }
        });
    }
    async findCommissionById(id) {
        return this.prisma.commission.findUnique({
            where: { id },
            include: {
                consultant: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            }
        });
    }
    async updateCommission(id, data) {
        return this.prisma.commission.update({
            where: { id },
            data,
            include: {
                consultant: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            }
        });
    }
    async updateManyCommissions(ids, data) {
        return this.prisma.commission.updateMany({
            where: { id: { in: ids } },
            data
        });
    }
    // --- Revenue ---
    async findRevenue(filters) {
        return this.prisma.regionalRevenue.findMany({
            where: filters,
            orderBy: { created_at: 'desc' }
        });
    }
    async createRevenue(data) {
        return this.prisma.regionalRevenue.create({ data });
    }
    async findRevenueByRegion(regionId) {
        return this.prisma.regionalRevenue.findMany({
            where: {
                region_id: regionId,
                status: 'PENDING'
            }
        });
    }
    // --- Settlements ---
    async findSettlements(filters, limit, offset) {
        return this.prisma.settlement.findMany({
            where: filters,
            orderBy: { generated_at: 'desc' },
            take: limit,
            skip: offset,
            include: {
                licensee: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
    }
    async findSettlementById(id) {
        return this.prisma.settlement.findUnique({
            where: { id },
            include: {
                licensee: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
    }
    async createSettlement(data) {
        return this.prisma.settlement.create({
            data,
            include: {
                licensee: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
    }
    async updateSettlement(id, data) {
        return this.prisma.settlement.update({
            where: { id },
            data,
            include: {
                licensee: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
    }
    async findSettlementsByStatus(status) {
        return this.prisma.settlement.findMany({
            where: { status },
            orderBy: { generated_at: 'desc' }
        });
    }
    // --- Attribution (Company-backed) ---
    async findCompanyAttribution(companyId) {
        return this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                region_id: true,
                sales_agent_id: true,
                attribution_locked: true,
                attribution_locked_at: true,
                sales_agent: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            }
        });
    }
    async updateCompanyAttribution(companyId, data) {
        return this.prisma.company.update({
            where: { id: companyId },
            data,
            select: {
                id: true,
                region_id: true,
                sales_agent_id: true,
                attribution_locked: true,
                attribution_locked_at: true
            }
        });
    }
    async createAuditLog(data) {
        return this.prisma.auditLog.create({ data });
    }
    // --- Region ---
    async findRegion(id) {
        return this.prisma.region.findUnique({ where: { id } });
    }
    async findAllRegions() {
        return this.prisma.region.findMany({ select: { id: true, licensee_id: true } });
    }
    // --- Company ---
    async findCompany(id) {
        return this.prisma.company.findUnique({
            where: { id },
            include: {
                region: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
    }
    // --- Licensee ---
    async findLicensee(id) {
        return this.prisma.regionalLicensee.findUnique({
            where: { id }
        });
    }
    async findAllLicensees() {
        return this.prisma.regionalLicensee.findMany();
    }
}
exports.AdminBillingRepository = AdminBillingRepository;
