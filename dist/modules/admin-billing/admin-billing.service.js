"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminBillingService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
const prisma_1 = require("../../utils/prisma");
class AdminBillingService extends service_1.BaseService {
    constructor(repository) {
        super();
        this.repository = repository;
    }
    // --- Commissions ---
    async getCommissions(limit, offset) {
        return this.repository.findCommissions({}, limit, offset);
    }
    async getConsultantCommissions(consultantId) {
        const commissions = await this.repository.findCommissionsByConsultant(consultantId);
        const total = commissions.length;
        const pending = commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + (c.amount || 0), 0);
        const confirmed = commissions.filter(c => c.status === 'CONFIRMED').reduce((sum, c) => sum + (c.amount || 0), 0);
        const paid = commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + (c.amount || 0), 0);
        return { commissions, stats: { total, pending, confirmed, paid } };
    }
    async payCommission(commissionId) {
        const commission = await this.repository.findCommissionById(commissionId);
        if (!commission)
            throw new http_exception_1.HttpException(404, 'Commission not found');
        if (commission.status === 'PAID') {
            throw new http_exception_1.HttpException(400, 'Commission already paid');
        }
        return this.repository.updateCommission(commissionId, {
            status: 'PAID',
            paid_at: new Date()
        });
    }
    async bulkPayCommissions(commissionIds) {
        if (!commissionIds || commissionIds.length === 0) {
            throw new http_exception_1.HttpException(400, 'Commission IDs array is required');
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const commissions = await tx.commission.findMany({
                where: { id: { in: commissionIds } }
            });
            const totalAmount = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);
            await tx.commission.updateMany({
                where: { id: { in: commissionIds } },
                data: { status: 'PAID', paid_at: new Date() }
            });
            return {
                processed: commissionIds.length,
                totalAmount,
                paidAt: new Date()
            };
        });
        return result;
    }
    // --- Revenue ---
    async getPendingRevenue() {
        return this.repository.findRevenue({ status: 'PENDING' });
    }
    async getRegionalRevenue(regionId) {
        const region = await this.repository.findRegion(regionId);
        if (!region)
            throw new http_exception_1.HttpException(404, 'Region not found');
        const revenue = await this.repository.findRevenueByRegion(regionId);
        const total = revenue.reduce((sum, r) => sum + (r.total_revenue || 0), 0);
        return { region, revenue, totalPendingRevenue: total };
    }
    async calculateMonthlyRevenue(regionId) {
        const region = await this.repository.findRegion(regionId);
        if (!region)
            throw new http_exception_1.HttpException(404, 'Region not found');
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const paidBills = await prisma_1.prisma.bill.findMany({
            where: {
                status: 'PAID',
                paid_at: { gte: periodStart, lte: periodEnd },
                company: { region_id: regionId }
            }
        });
        const totalRevenue = paidBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
        return this.repository.createRevenue({
            region_id: regionId,
            licensee_id: region.licensee_id || null,
            period_start: periodStart,
            period_end: periodEnd,
            total_revenue: totalRevenue,
            licensee_share: 0,
            hrm8_share: totalRevenue,
            status: 'PENDING'
        });
    }
    async processAllRegionsRevenue() {
        const regions = await this.repository.findAllRegions();
        const results = await Promise.all(regions.map(region => this.calculateMonthlyRevenue(region.id)));
        return {
            processedRegions: results.length,
            timestamp: new Date()
        };
    }
    // --- Settlements ---
    async getSettlements(limit, offset) {
        return this.repository.findSettlements({}, limit, offset);
    }
    async getSettlementById(settlementId) {
        const settlement = await this.repository.findSettlementById(settlementId);
        if (!settlement)
            throw new http_exception_1.HttpException(404, 'Settlement not found');
        return settlement;
    }
    async getSettlementStats() {
        const [total, pending, completed, failed] = await Promise.all([
            this.repository.findSettlements({}),
            this.repository.findSettlementsByStatus('PENDING'),
            this.repository.findSettlementsByStatus('COMPLETED'),
            this.repository.findSettlementsByStatus('FAILED')
        ]);
        const totalAmount = total.reduce((sum, s) => sum + (s.total_revenue || 0), 0);
        return {
            totalSettlements: total.length,
            pendingCount: pending.length,
            completedCount: completed.length,
            failedCount: failed.length,
            totalAmount
        };
    }
    async generateSettlement(licenseeId) {
        const licensee = await this.repository.findLicensee(licenseeId);
        if (!licensee)
            throw new http_exception_1.HttpException(404, 'Licensee not found');
        const regions = await prisma_1.prisma.region.findMany({
            where: { licensee_id: licenseeId },
            select: { id: true }
        });
        const regionIds = regions.map(r => r.id);
        if (!regionIds.length) {
            throw new http_exception_1.HttpException(400, 'Licensee has no regions assigned');
        }
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const paidBills = await prisma_1.prisma.bill.findMany({
            where: {
                status: 'PAID',
                paid_at: { gte: periodStart, lte: periodEnd },
                company: { region_id: { in: regionIds } }
            }
        });
        const totalRevenue = paidBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
        const licenseeShareRate = Number(licensee.revenue_share_percent || 0) / 100;
        const licenseeShare = totalRevenue * licenseeShareRate;
        const hrm8Share = totalRevenue - licenseeShare;
        return this.repository.createSettlement({
            licensee: { connect: { id: licenseeId } },
            period_start: periodStart,
            period_end: periodEnd,
            total_revenue: totalRevenue,
            licensee_share: licenseeShare,
            hrm8_share: hrm8Share,
            status: 'PENDING',
            generated_at: new Date()
        });
    }
    async generateAllSettlements() {
        const licensees = await this.repository.findAllLicensees();
        const results = await Promise.all(licensees.map(licensee => this.generateSettlement(licensee.id)));
        const totalAmount = results.reduce((sum, s) => sum + (s.total_revenue || 0), 0);
        return {
            generatedSettlements: results.length,
            totalAmount,
            timestamp: new Date()
        };
    }
    async markSettlementPaid(settlementId) {
        const settlement = await this.repository.findSettlementById(settlementId);
        if (!settlement)
            throw new http_exception_1.HttpException(404, 'Settlement not found');
        if (settlement.status === 'COMPLETED') {
            throw new http_exception_1.HttpException(400, 'Settlement already marked as paid');
        }
        return this.repository.updateSettlement(settlementId, {
            status: 'COMPLETED',
            payment_date: new Date()
        });
    }
    // --- Attribution ---
    async getAttribution(companyId) {
        const company = await this.repository.findCompany(companyId);
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        const attribution = await this.repository.findCompanyAttribution(companyId);
        if (!attribution)
            throw new http_exception_1.HttpException(404, 'Company not found');
        return {
            companyId: attribution.id,
            regionId: attribution.region_id,
            salesAgentId: attribution.sales_agent_id,
            status: attribution.attribution_locked ? 'LOCKED' : 'ACTIVE',
            source: attribution.sales_agent_id ? 'SALES_AGENT' : 'DIRECT'
        };
    }
    async getAttributionHistory(companyId) {
        const company = await this.repository.findCompany(companyId);
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        return prisma_1.prisma.auditLog.findMany({
            where: { entity_type: 'company_attribution', entity_id: companyId },
            orderBy: { performed_at: 'desc' }
        });
    }
    async lockAttribution(companyId) {
        const company = await this.repository.findCompany(companyId);
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        const attribution = await this.getAttribution(companyId);
        await this.repository.createAuditLog({
            entity_type: 'company_attribution',
            entity_id: companyId,
            action: 'LOCK',
            performed_by: 'ADMIN',
            changes: {
                previous_source: attribution.source,
                new_source: attribution.source,
                reason: 'LOCKED_BY_ADMIN'
            }
        });
        return this.repository.updateCompanyAttribution(companyId, {
            attribution_locked: true,
            attribution_locked_at: new Date()
        });
    }
    async overrideAttribution(companyId, data) {
        const company = await this.repository.findCompany(companyId);
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        const attribution = await this.getAttribution(companyId);
        await this.repository.createAuditLog({
            entity_type: 'company_attribution',
            entity_id: companyId,
            action: 'OVERRIDE',
            performed_by: 'ADMIN',
            changes: {
                previous_source: attribution.source,
                new_source: data.source,
                reason: data.reason
            }
        });
        return this.repository.updateCompanyAttribution(companyId, {
            sales_agent_id: data.salesAgentId || null,
            attribution_locked: true,
            attribution_locked_at: new Date()
        });
    }
}
exports.AdminBillingService = AdminBillingService;
