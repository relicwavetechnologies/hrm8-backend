import { BaseService } from '../../core/service';
import { RegionalLicenseeRepository } from './regional-licensee.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import { LicenseeStatus, HRM8UserRole, JobStatus } from '@prisma/client';
import { hashPassword } from '../../utils/password';

export class RegionalLicenseeService extends BaseService {
    constructor(private regionalLicenseeRepository: RegionalLicenseeRepository) {
        super();
    }

    private mapToDTO(licensee: any) {
        return {
            ...licensee,
            legalEntityName: licensee.legal_entity_name,
            taxId: licensee.tax_id,
            agreementStartDate: licensee.agreement_start_date,
            agreementEndDate: licensee.agreement_end_date,
            revenueSharePercent: licensee.revenue_share_percent,
            contractFileUrl: licensee.contract_file_url,
            managerContact: licensee.manager_contact,
            financeContact: licensee.finance_contact,
            complianceContact: licensee.compliance_contact,
        };
    }

    private mapToPersistence(data: any) {
        // Map common fields to ensure they exist if provided in camelCase
        const mapped: any = { ...data };
        if (data.legalEntityName !== undefined) mapped.legal_entity_name = data.legalEntityName;
        if (data.taxId !== undefined) mapped.tax_id = data.taxId;
        if (data.agreementStartDate !== undefined) mapped.agreement_start_date = data.agreementStartDate;
        if (data.agreementEndDate !== undefined) mapped.agreement_end_date = data.agreementEndDate;
        if (data.revenueSharePercent !== undefined) mapped.revenue_share_percent = data.revenueSharePercent;
        if (data.contractFileUrl !== undefined) mapped.contract_file_url = data.contractFileUrl;
        if (data.managerContact !== undefined) mapped.manager_contact = data.managerContact;
        if (data.financeContact !== undefined) mapped.finance_contact = data.financeContact;
        if (data.complianceContact !== undefined) mapped.compliance_contact = data.complianceContact;

        // Remove camelCase keys to avoid Prisma errors if strictly typed (though Prisma ignores unknown args usually, but best to clean up)
        delete mapped.legalEntityName;
        delete mapped.taxId;
        delete mapped.agreementStartDate;
        delete mapped.agreementEndDate;
        delete mapped.revenueSharePercent;
        delete mapped.contractFileUrl;
        delete mapped.managerContact;
        delete mapped.financeContact;
        delete mapped.complianceContact;
        delete mapped.password; // Handled separately

        return mapped;
    }

    async getAll(params: { status?: LicenseeStatus; limit?: number; offset?: number }) {
        const { status, limit = 50, offset = 0 } = params;
        const where: any = {};
        if (status) where.status = status;

        const [licensees, total] = await Promise.all([
            this.regionalLicenseeRepository.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
            }),
            this.regionalLicenseeRepository.count(where),
        ]);

        return { licensees: licensees.map(l => this.mapToDTO(l)), total };
    }

    async getById(id: string) {
        const licensee = await this.regionalLicenseeRepository.findById(id);
        if (!licensee) throw new HttpException(404, 'Licensee not found');
        return { licensee: this.mapToDTO(licensee) };
    }

    async create(data: any, performedBy?: string) {
        const persistenceData = this.mapToPersistence(data);
        const existing = await this.regionalLicenseeRepository.findByEmail(persistenceData.email);
        if (existing) throw new HttpException(409, 'Licensee with this email already exists');

        const licensee = await this.regionalLicenseeRepository.create(persistenceData);

        // Create HRM8 user for the licensee
        const password = data.password || 'vAbhi2678';
        const passwordHash = await hashPassword(password);

        await prisma.hRM8User.create({
            data: {
                email: persistenceData.email,
                password_hash: passwordHash,
                first_name: persistenceData.manager_contact?.split(' ')[0] || persistenceData.name,
                last_name: persistenceData.manager_contact?.split(' ').slice(1).join(' ') || 'Licensee',
                role: HRM8UserRole.REGIONAL_LICENSEE,
                licensee_id: licensee.id,
            },
        });

        return { licensee: this.mapToDTO(licensee) };
    }

    async update(id: string, data: any) {
        const persistenceData = this.mapToPersistence(data);
        const licensee = await this.regionalLicenseeRepository.update(id, persistenceData);
        return { licensee: this.mapToDTO(licensee) };
    }

    async delete(id: string) {
        // Check if licensee has settlement history
        const settlementCount = await prisma.settlement.count({
            where: { licensee_id: id },
        });

        if (settlementCount > 0) {
            throw new HttpException(
                400,
                `Cannot delete licensee with settlement history. Found ${settlementCount} settlement record(s). Settlements are historical records and cannot be removed.`
            );
        }

        // Check if it has regions
        const licensee = await this.regionalLicenseeRepository.findById(id);
        if (licensee && (licensee as any).regions?.length > 0) {
            throw new HttpException(400, 'Cannot delete licensee with assigned regions. Unassign regions first.');
        }

        return this.regionalLicenseeRepository.delete(id);
    }

    async updateStatus(id: string, status: LicenseeStatus) {
        let result;
        if (status === 'SUSPENDED') {
            result = await this.suspend(id);
        } else if (status === 'TERMINATED') {
            result = await this.terminate(id);
        } else {
            result = await this.regionalLicenseeRepository.update(id, { status });
        }
        return { licensee: this.mapToDTO(result) };
    }

    async suspend(id: string) {
        const regions = await prisma.region.findMany({
            where: { licensee_id: id },
            select: { id: true },
        });
        const regionIds = regions.map(r => r.id);

        // Pause jobs in these regions
        await prisma.job.updateMany({
            where: { region_id: { in: regionIds }, status: 'OPEN' },
            data: { status: 'ON_HOLD' },
        });

        return this.regionalLicenseeRepository.update(id, { status: 'SUSPENDED' });
    }

    async terminate(id: string) {
        const regions = await prisma.region.findMany({
            where: { licensee_id: id },
            select: { id: true },
        });
        const regionIds = regions.map(r => r.id);

        // Unassign regions
        await prisma.region.updateMany({
            where: { licensee_id: id },
            data: { licensee_id: null, owner_type: 'HRM8' },
        });

        // Resume jobs (now under HRM8)
        await prisma.job.updateMany({
            where: { region_id: { in: regionIds }, status: 'ON_HOLD' },
            data: { status: 'OPEN' },
        });

        return this.regionalLicenseeRepository.update(id, { status: 'TERMINATED' });
    }

    async getStats() {
        return this.regionalLicenseeRepository.getStats();
    }

    async getOverview() {
        const licensees = await this.regionalLicenseeRepository.findMany({
            orderBy: { created_at: 'desc' },
        });

        const licenseeIds = licensees.map((licensee) => licensee.id);
        if (licenseeIds.length === 0) {
            return {
                summary: {
                    totalLicensees: 0,
                    activeLicensees: 0,
                    suspendedLicensees: 0,
                    terminatedLicensees: 0,
                    totalRegions: 0,
                    totalActiveJobs: 0,
                    totalActiveConsultants: 0,
                    totalRevenue: 0,
                    totalLicenseeShare: 0,
                    totalHrm8Share: 0,
                    avgRevenueSharePercent: 0,
                },
                performance: [],
                revenueShareBreakdown: [],
                topPerformers: [],
            };
        }

        const regions = await prisma.region.findMany({
            where: { licensee_id: { in: licenseeIds } },
            select: { id: true, licensee_id: true },
        });

        const regionIds = regions.map((region) => region.id);

        const [jobsByRegion, consultantsByRegion, settlementsByLicensee] = await Promise.all([
            regionIds.length
                ? prisma.job.groupBy({
                    by: ['region_id'],
                    where: { region_id: { in: regionIds }, status: JobStatus.OPEN },
                    _count: { id: true },
                })
                : Promise.resolve([]),
            regionIds.length
                ? prisma.consultant.groupBy({
                    by: ['region_id'],
                    where: { region_id: { in: regionIds }, status: 'ACTIVE' as any },
                    _count: { id: true },
                })
                : Promise.resolve([]),
            prisma.settlement.groupBy({
                by: ['licensee_id'],
                where: { licensee_id: { in: licenseeIds } },
                _sum: { total_revenue: true, licensee_share: true, hrm8_share: true },
                _count: { id: true },
                _max: { period_end: true },
            }),
        ]);

        const regionsByLicensee = new Map<string, string[]>();
        regions.forEach((region) => {
            const licenseeId = region.licensee_id;
            if (!licenseeId) return;
            const current = regionsByLicensee.get(licenseeId) || [];
            current.push(region.id);
            regionsByLicensee.set(licenseeId, current);
        });

        const jobsCountByRegion = new Map<string, number>();
        jobsByRegion.forEach((row) => jobsCountByRegion.set(row.region_id || '', row._count.id));

        const consultantsCountByRegion = new Map<string, number>();
        consultantsByRegion.forEach((row) => consultantsCountByRegion.set(row.region_id || '', row._count.id));

        const settlementsByLicenseeId = new Map<string, (typeof settlementsByLicensee)[number]>();
        settlementsByLicensee.forEach((row) => settlementsByLicenseeId.set(row.licensee_id, row));

        const performance = licensees.map((licensee) => {
            const mappedLicensee = this.mapToDTO(licensee);
            const assignedRegions = regionsByLicensee.get(licensee.id) || [];
            const activeJobs = assignedRegions.reduce((sum, regionId) => sum + (jobsCountByRegion.get(regionId) || 0), 0);
            const activeConsultants = assignedRegions.reduce((sum, regionId) => sum + (consultantsCountByRegion.get(regionId) || 0), 0);
            const settlement = settlementsByLicenseeId.get(licensee.id);
            const totalRevenue = settlement?._sum.total_revenue || 0;
            const licenseeShare = settlement?._sum.licensee_share || 0;
            const hrm8Share = settlement?._sum.hrm8_share || 0;

            return {
                licenseeId: mappedLicensee.id,
                name: mappedLicensee.name,
                status: mappedLicensee.status,
                revenueSharePercent: mappedLicensee.revenueSharePercent || 0,
                regionsCount: assignedRegions.length,
                activeJobs,
                activeConsultants,
                totalRevenue,
                licenseeShare,
                hrm8Share,
                settlementsCount: settlement?._count.id || 0,
                lastSettlementDate: settlement?._max.period_end || null,
            };
        });

        const summary = {
            totalLicensees: performance.length,
            activeLicensees: performance.filter((item) => item.status === 'ACTIVE').length,
            suspendedLicensees: performance.filter((item) => item.status === 'SUSPENDED').length,
            terminatedLicensees: performance.filter((item) => item.status === 'TERMINATED').length,
            totalRegions: performance.reduce((sum, item) => sum + item.regionsCount, 0),
            totalActiveJobs: performance.reduce((sum, item) => sum + item.activeJobs, 0),
            totalActiveConsultants: performance.reduce((sum, item) => sum + item.activeConsultants, 0),
            totalRevenue: performance.reduce((sum, item) => sum + item.totalRevenue, 0),
            totalLicenseeShare: performance.reduce((sum, item) => sum + item.licenseeShare, 0),
            totalHrm8Share: performance.reduce((sum, item) => sum + item.hrm8Share, 0),
            avgRevenueSharePercent: performance.length
                ? Math.round((performance.reduce((sum, item) => sum + item.revenueSharePercent, 0) / performance.length) * 100) / 100
                : 0,
        };

        const revenueShareBreakdown = performance.map((item) => ({
            licenseeId: item.licenseeId,
            licenseeName: item.name,
            totalRevenue: item.totalRevenue,
            licenseeShare: item.licenseeShare,
            hrm8Share: item.hrm8Share,
        }));

        const topPerformers = [...performance]
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 5);

        return {
            summary,
            performance,
            revenueShareBreakdown,
            topPerformers,
        };
    }

    async getImpactPreview(id: string) {
        const regions = await prisma.region.findMany({
            where: { licensee_id: id },
            select: { id: true },
        });
        const regionIds = regions.map(r => r.id);

        const [activeJobs, consultants] = await Promise.all([
            prisma.job.count({ where: { region_id: { in: regionIds }, status: 'OPEN' } }),
            prisma.consultant.count({ where: { region_id: { in: regionIds }, status: 'ACTIVE' } }),
        ]);

        return {
            regions: regionIds.length,
            activeJobs,
            consultants,
            pendingRevenue: 0, // Placeholder
        };
    }
}
