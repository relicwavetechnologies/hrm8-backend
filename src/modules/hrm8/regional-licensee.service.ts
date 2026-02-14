import { BaseService } from '../../core/service';
import { RegionalLicenseeRepository } from './regional-licensee.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import { BillStatus, HRM8UserRole, HRM8UserStatus, JobStatus, LicenseeStatus } from '@prisma/client';
import { hashPassword } from '../../utils/password';

type LicenseeScope = {
    role?: string;
    licenseeId?: string;
};

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
            createdAt: licensee.created_at,
            updatedAt: licensee.updated_at,
        };
    }

    private getScopedWhere(scope?: LicenseeScope) {
        if (scope?.role === 'REGIONAL_LICENSEE') {
            if (!scope.licenseeId) throw new HttpException(403, 'Licensee scope is missing');
            return { id: scope.licenseeId };
        }
        return {};
    }

    private assertScopedAccess(id: string, scope?: LicenseeScope) {
        if (scope?.role === 'REGIONAL_LICENSEE' && scope.licenseeId !== id) {
            throw new HttpException(404, 'Licensee not found');
        }
    }

    private async audit(
        action: string,
        entityId: string,
        performedBy: string | undefined,
        description: string,
        changes?: Record<string, unknown>
    ) {
        await prisma.auditLog.create({
            data: {
                entity_type: 'REGIONAL_LICENSEE',
                entity_id: entityId,
                action,
                performed_by: performedBy || 'system',
                description,
                changes: (changes || null) as any,
            },
        });
    }

    private async getLicenseeOrThrow(id: string) {
        const licensee = await this.regionalLicenseeRepository.findById(id);
        if (!licensee) throw new HttpException(404, 'Licensee not found');
        return licensee;
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

    async getAll(params: { status?: LicenseeStatus; limit?: number; offset?: number; role?: string; licenseeId?: string }) {
        const { status, limit = 50, offset = 0, role, licenseeId } = params;
        const where: any = this.getScopedWhere({ role, licenseeId });
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

    async getById(id: string, scope?: LicenseeScope) {
        this.assertScopedAccess(id, scope);
        const licensee = await this.getLicenseeOrThrow(id);
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

        await this.audit('CREATE_LICENSEE', licensee.id, performedBy, 'Regional licensee created', {
            name: licensee.name,
            email: licensee.email,
            status: licensee.status,
            revenue_share_percent: licensee.revenue_share_percent,
        });

        return { licensee: this.mapToDTO(licensee) };
    }

    async update(id: string, data: any, performedBy?: string) {
        const statusUpdate = (data.status ?? data.licenseeStatus) as LicenseeStatus | undefined;
        if (statusUpdate) {
            return this.updateStatus(id, statusUpdate, performedBy);
        }

        const existing = await this.getLicenseeOrThrow(id);
        if (existing.status === 'TERMINATED') {
            throw new HttpException(400, 'Cannot update a terminated licensee');
        }

        const persistenceData = this.mapToPersistence(data);
        delete persistenceData.status;
        const licensee = await this.regionalLicenseeRepository.update(id, persistenceData);
        await this.audit('UPDATE_LICENSEE', id, performedBy, 'Regional licensee updated', {
            updated_fields: Object.keys(persistenceData),
        });
        return { licensee: this.mapToDTO(licensee) };
    }

    async delete(id: string, performedBy?: string) {
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

        const deleted = await this.regionalLicenseeRepository.delete(id);
        await this.audit('DELETE_LICENSEE', id, performedBy, 'Regional licensee deleted');
        return deleted;
    }

    async updateStatus(id: string, status: LicenseeStatus, performedBy?: string, notes?: string) {
        if (!Object.values(LicenseeStatus).includes(status)) {
            throw new HttpException(400, 'Invalid licensee status');
        }

        const current = await this.getLicenseeOrThrow(id);
        if (current.status === 'TERMINATED' && status !== 'TERMINATED') {
            throw new HttpException(400, 'Cannot change status of a terminated licensee');
        }

        if (status === 'SUSPENDED') {
            return this.suspend(id, performedBy, notes);
        }
        if (status === 'TERMINATED') {
            return this.terminate(id, performedBy, notes);
        }
        if (status === 'ACTIVE') {
            if (current.status === 'ACTIVE') {
                return { licensee: this.mapToDTO(current) };
            }
            if (current.status !== 'SUSPENDED') {
                throw new HttpException(400, 'Only suspended licensees can be reactivated');
            }
            return this.reactivate(id, performedBy, notes);
        }

        const updated = await this.regionalLicenseeRepository.update(id, { status });
        await this.audit('UPDATE_LICENSEE_STATUS', id, performedBy, `Licensee status updated to ${status}`, {
            previous_status: current.status,
            new_status: status,
            notes: notes || null,
        });
        return { licensee: this.mapToDTO(updated) };
    }

    async suspend(id: string, performedBy?: string, notes?: string) {
        const current = await this.getLicenseeOrThrow(id);
        if (current.status === 'TERMINATED') {
            throw new HttpException(400, 'Cannot suspend a terminated licensee');
        }
        if (current.status === 'SUSPENDED') {
            const regionsAffected = await prisma.region.count({ where: { licensee_id: id } });
            return {
                licensee: this.mapToDTO(current),
                jobsPaused: 0,
                regionsAffected,
            };
        }

        const regions = await prisma.region.findMany({
            where: { licensee_id: id },
            select: { id: true },
        });
        const regionIds = regions.map(r => r.id);

        const jobsPaused = regionIds.length === 0
            ? 0
            : await prisma.job.count({ where: { region_id: { in: regionIds }, status: JobStatus.OPEN } });

        const updated = await prisma.$transaction(async (tx) => {
            if (regionIds.length > 0) {
                await tx.job.updateMany({
                    where: { region_id: { in: regionIds }, status: JobStatus.OPEN },
                    data: { status: JobStatus.ON_HOLD },
                });
            }
            await tx.hRM8User.updateMany({
                where: { licensee_id: id, role: HRM8UserRole.REGIONAL_LICENSEE, status: HRM8UserStatus.ACTIVE },
                data: { status: HRM8UserStatus.SUSPENDED },
            });
            return tx.regionalLicensee.update({
                where: { id },
                data: { status: LicenseeStatus.SUSPENDED },
            });
        });

        await this.audit('SUSPEND_LICENSEE', id, performedBy, 'Licensee suspended', {
            previous_status: current.status,
            new_status: LicenseeStatus.SUSPENDED,
            regions_affected: regionIds.length,
            jobs_paused: jobsPaused,
            notes: notes || null,
        });

        return {
            licensee: this.mapToDTO(updated),
            jobsPaused,
            regionsAffected: regionIds.length,
        };
    }

    async reactivate(id: string, performedBy?: string, notes?: string) {
        const current = await this.getLicenseeOrThrow(id);
        if (current.status === 'TERMINATED') {
            throw new HttpException(400, 'Cannot reactivate a terminated licensee');
        }
        if (current.status === 'ACTIVE') {
            return { licensee: this.mapToDTO(current), jobsResumed: 0 };
        }
        if (current.status !== 'SUSPENDED') {
            throw new HttpException(400, 'Only suspended licensees can be reactivated');
        }

        const regions = await prisma.region.findMany({
            where: { licensee_id: id },
            select: { id: true },
        });
        const regionIds = regions.map(r => r.id);
        const jobsResumed = regionIds.length === 0
            ? 0
            : await prisma.job.count({ where: { region_id: { in: regionIds }, status: JobStatus.ON_HOLD } });

        const updated = await prisma.$transaction(async (tx) => {
            if (regionIds.length > 0) {
                await tx.job.updateMany({
                    where: { region_id: { in: regionIds }, status: JobStatus.ON_HOLD },
                    data: { status: JobStatus.OPEN },
                });
            }
            await tx.hRM8User.updateMany({
                where: { licensee_id: id, role: HRM8UserRole.REGIONAL_LICENSEE, status: HRM8UserStatus.SUSPENDED },
                data: { status: HRM8UserStatus.ACTIVE },
            });
            return tx.regionalLicensee.update({
                where: { id },
                data: { status: LicenseeStatus.ACTIVE },
            });
        });

        await this.audit('REACTIVATE_LICENSEE', id, performedBy, 'Licensee reactivated', {
            previous_status: current.status,
            new_status: LicenseeStatus.ACTIVE,
            jobs_resumed: jobsResumed,
            notes: notes || null,
        });

        return {
            licensee: this.mapToDTO(updated),
            jobsResumed,
        };
    }

    async terminate(id: string, performedBy?: string, notes?: string) {
        const current = await this.getLicenseeOrThrow(id);
        if (current.status === 'TERMINATED') {
            return {
                licensee: this.mapToDTO(current),
                regionsUnassigned: 0,
                jobsResumed: 0,
                companiesReassigned: 0,
            };
        }

        const regions = await prisma.region.findMany({
            where: { licensee_id: id },
            select: { id: true },
        });
        const regionIds = regions.map(r => r.id);

        const [jobsResumed, companiesReassigned, impactPreview] = await Promise.all([
            regionIds.length === 0
                ? Promise.resolve(0)
                : prisma.job.count({ where: { region_id: { in: regionIds }, status: JobStatus.ON_HOLD } }),
            regionIds.length === 0
                ? Promise.resolve(0)
                : prisma.company.count({ where: { region_id: { in: regionIds } } }),
            this.getImpactPreview(id),
        ]);

        const updated = await prisma.$transaction(async (tx) => {
            if (regionIds.length > 0) {
                await tx.region.updateMany({
                    where: { licensee_id: id },
                    data: { licensee_id: null, owner_type: 'HRM8' as any },
                });

                await tx.company.updateMany({
                    where: { region_id: { in: regionIds } },
                    data: { licensee_id: null, region_owner_type: 'HRM8' as any },
                });

                await tx.job.updateMany({
                    where: { region_id: { in: regionIds }, status: JobStatus.ON_HOLD },
                    data: { status: JobStatus.OPEN },
                });
            }

            await tx.hRM8User.updateMany({
                where: { licensee_id: id, role: HRM8UserRole.REGIONAL_LICENSEE },
                data: { status: HRM8UserStatus.TERMINATED },
            });

            return tx.regionalLicensee.update({
                where: { id },
                data: { status: LicenseeStatus.TERMINATED },
            });
        });

        await this.audit('TERMINATE_LICENSEE', id, performedBy, 'Licensee terminated', {
            previous_status: current.status,
            new_status: LicenseeStatus.TERMINATED,
            regions_unassigned: regionIds.length,
            jobs_resumed: jobsResumed,
            companies_reassigned: companiesReassigned,
            pending_revenue: impactPreview.pendingRevenue,
            notes: notes || null,
        });

        return {
            licensee: this.mapToDTO(updated),
            regionsUnassigned: regionIds.length,
            jobsResumed,
            companiesReassigned,
            finalSettlement: impactPreview.pendingRevenue > 0 ? { amount: impactPreview.pendingRevenue } : undefined,
        };
    }

    async getStats(scope?: LicenseeScope) {
        const where = this.getScopedWhere(scope);
        const [total, active, suspended] = await Promise.all([
            prisma.regionalLicensee.count({ where }),
            prisma.regionalLicensee.count({ where: { ...where, status: LicenseeStatus.ACTIVE } }),
            prisma.regionalLicensee.count({ where: { ...where, status: LicenseeStatus.SUSPENDED } }),
        ]);

        return { total, active, suspended };
    }

    async getOverview(scope?: LicenseeScope) {
        const where = this.getScopedWhere(scope);
        const licensees = await this.regionalLicenseeRepository.findMany({
            where,
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

    async getImpactPreview(id: string, scope?: LicenseeScope) {
        this.assertScopedAccess(id, scope);
        await this.getLicenseeOrThrow(id);

        const regions = await prisma.region.findMany({
            where: { licensee_id: id },
            select: { id: true },
        });
        const regionIds = regions.map(r => r.id);

        const [activeJobs, consultants, pendingBills, pendingSettlements] = await Promise.all([
            prisma.job.count({ where: { region_id: { in: regionIds }, status: JobStatus.OPEN } }),
            prisma.consultant.count({ where: { region_id: { in: regionIds }, status: 'ACTIVE' as any } }),
            regionIds.length === 0
                ? Promise.resolve({ _sum: { total_amount: 0 } })
                : prisma.bill.aggregate({
                    where: {
                        region_id: { in: regionIds },
                        status: { in: [BillStatus.PENDING, BillStatus.OVERDUE] },
                    },
                    _sum: { total_amount: true },
                }),
            prisma.settlement.aggregate({
                where: {
                    licensee_id: id,
                    status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
                },
                _sum: { licensee_share: true },
            }),
        ]);

        const pendingRevenue = Number(pendingBills._sum.total_amount || 0) + Number(pendingSettlements._sum.licensee_share || 0);

        return {
            regions: regionIds.length,
            activeJobs,
            consultants,
            pendingRevenue,
        };
    }
}
