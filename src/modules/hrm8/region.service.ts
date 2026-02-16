import { BaseService } from '../../core/service';
import { RegionRepository } from './region.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import { RegionOwnerType, RevenueStatus } from '@prisma/client';

export class RegionService extends BaseService {
    constructor(private regionRepository: RegionRepository) {
        super();
    }

    private parseBoolean(value: unknown): boolean | undefined {
        if (typeof value === 'boolean') return value;
        if (typeof value !== 'string') return undefined;
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        return undefined;
    }

    private async assertLicenseeExists(licenseeId: string) {
        const licensee = await prisma.regionalLicensee.findUnique({
            where: { id: licenseeId },
            select: { id: true, status: true },
        });
        if (!licensee) {
            throw new HttpException(404, 'Licensee not found');
        }
        if (licensee.status !== 'ACTIVE') {
            throw new HttpException(400, 'Only ACTIVE licensees can be assigned');
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
                entity_type: 'REGION',
                entity_id: entityId,
                action,
                performed_by: performedBy || 'system',
                description,
                changes: (changes || null) as any,
            },
        });
    }

    private normalizeRegionInput(data: any, partial = false) {
        const normalized: Record<string, unknown> = {};

        const ownerType = (data.ownerType ?? data.owner_type) as RegionOwnerType | undefined;
        const licenseeId = (data.licenseeId ?? data.licensee_id) as string | undefined;
        const isActive = this.parseBoolean(data.isActive ?? data.is_active);

        const setIfDefined = (key: string, value: unknown) => {
            if (value !== undefined) normalized[key] = value;
        };

        setIfDefined('name', data.name);
        setIfDefined('code', data.code);
        setIfDefined('country', data.country);
        setIfDefined('state_province', data.stateProvince ?? data.state_province);
        setIfDefined('city', data.city);
        setIfDefined('boundaries', data.boundaries);
        setIfDefined('is_active', isActive);

        if (!partial || ownerType !== undefined) {
            setIfDefined('owner_type', ownerType);
        }

        if (!partial || licenseeId !== undefined) {
            setIfDefined('licensee_id', licenseeId);
        }

        return normalized;
    }

    private async validateOwnerAndLicensee(
        mappedData: Record<string, unknown>,
        currentRegion?: { owner_type: RegionOwnerType; licensee_id: string | null }
    ) {
        const ownerType = (mappedData.owner_type ?? currentRegion?.owner_type) as RegionOwnerType | undefined;
        const licenseeId = (mappedData.licensee_id ?? currentRegion?.licensee_id) as string | null | undefined;

        if (ownerType === 'LICENSEE') {
            if (!licenseeId) {
                throw new HttpException(400, 'licenseeId is required when ownerType is LICENSEE');
            }
            await this.assertLicenseeExists(licenseeId);
        }

        if (ownerType === 'HRM8') {
            mappedData.licensee_id = null;
        }
    }

    async create(data: any, performedBy?: string) {
        const mappedData = this.normalizeRegionInput(data);
        const code = mappedData.code as string | undefined;
        if (!code) {
            throw new HttpException(400, 'code is required');
        }

        const existing = await this.regionRepository.findByCode(code);
        if (existing) {
            throw new HttpException(409, 'Region code already exists');
        }

        await this.validateOwnerAndLicensee(mappedData);

        const created = await this.regionRepository.create(mappedData as any);
        await this.audit('CREATE_REGION', created.id, performedBy, 'Region created', {
            name: created.name,
            code: created.code,
            owner_type: created.owner_type,
            licensee_id: created.licensee_id,
        });
        return this.mapToDTO(created);
    }

    private mapToDTO(region: any) {
        return {
            ...region,
            stateProvince: region.state_province,
            ownerType: region.owner_type,
            isActive: region.is_active,
            licenseeId: region.licensee_id,
        };
    }

    async getById(id: string, opts?: { regionIds?: string[]; role?: string }) {
        if (opts?.role === 'REGIONAL_LICENSEE') {
            if (!opts.regionIds || opts.regionIds.length === 0 || !opts.regionIds.includes(id)) {
                throw new HttpException(404, 'Region not found');
            }
        }

        const region = await this.regionRepository.findById(id);
        if (!region) {
            throw new HttpException(404, 'Region not found');
        }
        return this.mapToDTO(region);
    }

    async getAll(filters: any) {
        const { ownerType, licenseeId, regionIds, country, isActive } = filters;
        const where: any = {};
        if (ownerType && ownerType !== 'all') where.owner_type = ownerType;
        if (licenseeId) where.licensee_id = licenseeId;
        if (regionIds) where.id = { in: regionIds };
        if (country) where.country = country;
        const active = this.parseBoolean(isActive);
        if (active !== undefined) where.is_active = active;

        const regions = await this.regionRepository.findMany({
            where,
            orderBy: { name: 'asc' },
        });
        return regions.map(r => this.mapToDTO(r));
    }

    async getOverview(filters: { regionIds?: string[] }) {
        const regionWhere = filters.regionIds && filters.regionIds.length > 0
            ? { id: { in: filters.regionIds } }
            : {};

        const regions = await prisma.region.findMany({
            where: regionWhere,
            select: {
                id: true,
                name: true,
                code: true,
                country: true,
                owner_type: true,
                is_active: true,
                licensee_id: true,
                licensee: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        if (regions.length === 0) {
            return {
                summary: {
                    total_regions: 0,
                    active_regions: 0,
                    inactive_regions: 0,
                    hrm8_owned_regions: 0,
                    licensee_owned_regions: 0,
                    assigned_licensees: 0,
                    total_companies: 0,
                    open_jobs: 0,
                    active_consultants: 0,
                    total_revenue: 0,
                    total_licensee_share: 0,
                    total_hrm8_share: 0,
                },
                ownership_distribution: [],
                country_distribution: [],
                top_regions: [],
            };
        }

        const regionIds = regions.map((region) => region.id);

        const [companiesByRegion, openJobsByRegion, activeConsultantsByRegion, revenueByRegion] = await Promise.all([
            prisma.company.groupBy({
                by: ['region_id'],
                where: { region_id: { in: regionIds } },
                _count: { id: true },
            }),
            prisma.job.groupBy({
                by: ['region_id'],
                where: { region_id: { in: regionIds }, status: 'OPEN' as any },
                _count: { id: true },
            }),
            prisma.consultant.groupBy({
                by: ['region_id'],
                where: { region_id: { in: regionIds }, status: 'ACTIVE' as any },
                _count: { id: true },
            }),
            prisma.regionalRevenue.groupBy({
                by: ['region_id'],
                where: {
                    region_id: { in: regionIds },
                    status: { in: [RevenueStatus.CONFIRMED, RevenueStatus.PAID] },
                },
                _sum: {
                    total_revenue: true,
                    licensee_share: true,
                    hrm8_share: true,
                },
            }),
        ]);

        const companiesMap = new Map(companiesByRegion.map((row) => [row.region_id, row._count.id || 0]));
        const openJobsMap = new Map(openJobsByRegion.map((row) => [row.region_id, row._count.id || 0]));
        const consultantsMap = new Map(activeConsultantsByRegion.map((row) => [row.region_id, row._count.id || 0]));
        const revenueMap = new Map(
            revenueByRegion.map((row) => [
                row.region_id,
                {
                    total_revenue: row._sum.total_revenue || 0,
                    licensee_share: row._sum.licensee_share || 0,
                    hrm8_share: row._sum.hrm8_share || 0,
                },
            ]),
        );

        const regionRows = regions.map((region) => {
            const companies = companiesMap.get(region.id) || 0;
            const openJobs = openJobsMap.get(region.id) || 0;
            const activeConsultants = consultantsMap.get(region.id) || 0;
            const revenue = revenueMap.get(region.id) || {
                total_revenue: 0,
                licensee_share: 0,
                hrm8_share: 0,
            };

            return {
                id: region.id,
                code: region.code,
                name: region.name,
                country: region.country,
                owner_type: region.owner_type,
                is_active: region.is_active,
                licensee_id: region.licensee_id,
                licensee_name: region.licensee?.name || null,
                companies,
                open_jobs: openJobs,
                active_consultants: activeConsultants,
                total_revenue: revenue.total_revenue,
                licensee_share: revenue.licensee_share,
                hrm8_share: revenue.hrm8_share,
            };
        });

        const summary = regionRows.reduce(
            (acc, row) => {
                acc.total_regions += 1;
                acc.active_regions += row.is_active ? 1 : 0;
                acc.inactive_regions += row.is_active ? 0 : 1;
                acc.hrm8_owned_regions += row.owner_type === 'HRM8' ? 1 : 0;
                acc.licensee_owned_regions += row.owner_type === 'LICENSEE' ? 1 : 0;
                acc.total_companies += row.companies;
                acc.open_jobs += row.open_jobs;
                acc.active_consultants += row.active_consultants;
                acc.total_revenue += row.total_revenue;
                acc.total_licensee_share += row.licensee_share;
                acc.total_hrm8_share += row.hrm8_share;
                return acc;
            },
            {
                total_regions: 0,
                active_regions: 0,
                inactive_regions: 0,
                hrm8_owned_regions: 0,
                licensee_owned_regions: 0,
                total_companies: 0,
                open_jobs: 0,
                active_consultants: 0,
                total_revenue: 0,
                total_licensee_share: 0,
                total_hrm8_share: 0,
            },
        );

        const assignedLicensees = new Set(
            regionRows
                .map((row) => row.licensee_id)
                .filter((value): value is string => Boolean(value)),
        );

        const ownershipDistribution = [
            { owner_type: 'HRM8', count: summary.hrm8_owned_regions },
            { owner_type: 'LICENSEE', count: summary.licensee_owned_regions },
        ];

        const countryCount = new Map<string, number>();
        regionRows.forEach((row) => {
            countryCount.set(row.country, (countryCount.get(row.country) || 0) + 1);
        });

        const countryDistribution = Array.from(countryCount.entries())
            .map(([country, count]) => ({ country, count }))
            .sort((a, b) => b.count - a.count);

        const topRegions = [...regionRows]
            .sort((a, b) => {
                if (b.total_revenue !== a.total_revenue) return b.total_revenue - a.total_revenue;
                if (b.open_jobs !== a.open_jobs) return b.open_jobs - a.open_jobs;
                return b.active_consultants - a.active_consultants;
            })
            .slice(0, 8);

        return {
            summary: {
                ...summary,
                assigned_licensees: assignedLicensees.size,
            },
            ownership_distribution: ownershipDistribution,
            country_distribution: countryDistribution,
            top_regions: topRegions,
        };
    }

    async update(id: string, data: any, performedBy?: string) {
        const currentRegion = await this.regionRepository.findById(id);
        if (!currentRegion) {
            throw new HttpException(404, 'Region not found');
        }

        const mappedData = this.normalizeRegionInput(data, true);

        if (mappedData.code) {
            const existing = await this.regionRepository.findByCode(String(mappedData.code));
            if (existing && existing.id !== id) {
                throw new HttpException(409, 'Region code already exists');
            }
        }

        await this.validateOwnerAndLicensee(mappedData, {
            owner_type: currentRegion.owner_type,
            licensee_id: currentRegion.licensee_id,
        });

        const updated = await this.regionRepository.update(id, mappedData as any);
        await this.audit('UPDATE_REGION', id, performedBy, 'Region updated', {
            previous: {
                name: currentRegion.name,
                code: currentRegion.code,
                owner_type: currentRegion.owner_type,
                licensee_id: currentRegion.licensee_id,
                is_active: currentRegion.is_active,
            },
            current: {
                name: updated.name,
                code: updated.code,
                owner_type: updated.owner_type,
                licensee_id: updated.licensee_id,
                is_active: updated.is_active,
            },
        });
        return this.mapToDTO(updated);
    }

    async delete(id: string, performedBy?: string) {
        const existing = await this.regionRepository.findById(id);
        if (!existing) {
            throw new HttpException(404, 'Region not found');
        }

        const impact = await this.getTransferImpact(id);
        const hasDependencies = Object.values(impact).some((count) => Number(count) > 0);

        if (hasDependencies) {
            await this.regionRepository.update(id, { is_active: false });
            await this.audit('DEACTIVATE_REGION', id, performedBy, 'Region deactivated due to linked records', {
                impact,
            });
            return {
                message: 'Region has linked records and was deactivated instead of deleted',
                deactivated: true,
                impact,
            };
        }

        await this.regionRepository.delete(id);
        await this.audit('DELETE_REGION', id, performedBy, 'Region deleted');
        return {
            message: 'Region deleted successfully',
            deleted: true,
        };
    }

    async assignLicensee(regionId: string, licenseeId: string, performedBy?: string) {
        await this.assertLicenseeExists(licenseeId);
        const region = await this.regionRepository.findById(regionId);
        if (!region) throw new HttpException(404, 'Region not found');
        if (!region.is_active) throw new HttpException(400, 'Cannot assign a licensee to an inactive region');
        if (region.licensee_id === licenseeId && region.owner_type === 'LICENSEE') {
            return this.mapToDTO(region);
        }

        const updated = await prisma.$transaction(async (tx) => {
            await tx.company.updateMany({
                where: { region_id: regionId },
                data: {
                    licensee_id: licenseeId,
                    region_owner_type: RegionOwnerType.LICENSEE,
                },
            });

            return tx.region.update({
                where: { id: regionId },
                data: {
                    licensee_id: licenseeId,
                    owner_type: RegionOwnerType.LICENSEE,
                },
                include: { licensee: true },
            });
        });

        const affectedCompanies = await prisma.company.count({ where: { region_id: regionId, licensee_id: licenseeId } });
        await this.audit('ASSIGN_LICENSEE', regionId, performedBy, 'Licensee assigned to region', {
            from_licensee_id: region.licensee_id,
            to_licensee_id: licenseeId,
            companies_updated: affectedCompanies,
        });
        return this.mapToDTO(updated);
    }

    async unassignLicensee(regionId: string, performedBy?: string) {
        const region = await this.regionRepository.findById(regionId);
        if (!region) throw new HttpException(404, 'Region not found');
        if (!region.licensee_id && region.owner_type === 'HRM8') {
            return this.mapToDTO(region);
        }

        const updated = await prisma.$transaction(async (tx) => {
            await tx.company.updateMany({
                where: { region_id: regionId },
                data: {
                    licensee_id: null,
                    region_owner_type: RegionOwnerType.HRM8,
                },
            });

            return tx.region.update({
                where: { id: regionId },
                data: {
                    licensee_id: null,
                    owner_type: RegionOwnerType.HRM8,
                },
                include: { licensee: true },
            });
        });

        const affectedCompanies = await prisma.company.count({ where: { region_id: regionId, licensee_id: null } });
        await this.audit('UNASSIGN_LICENSEE', regionId, performedBy, 'Licensee unassigned from region', {
            from_licensee_id: region.licensee_id,
            companies_updated: affectedCompanies,
        });
        return this.mapToDTO(updated);
    }

    async getTransferImpact(id: string) {
        const [companies, jobs, consultants, opportunities, openInvoices] = await Promise.all([
            prisma.company.count({ where: { region_id: id } }),
            prisma.job.count({ where: { region_id: id, status: { in: ['OPEN', 'ON_HOLD'] } } }),
            prisma.consultant.count({ where: { region_id: id, status: 'ACTIVE' } }),
            prisma.opportunity.count({
                where: {
                    company: { region_id: id },
                    stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
                }
            }),
            prisma.bill.count({
                where: {
                    status: { in: ['PENDING', 'OVERDUE'] },
                    company: { region_id: id },
                }
            })
        ]);

        return {
            companies,
            jobs,
            consultants,
            opportunities,
            openInvoices,
        };
    }

    async transferOwnership(regionId: string, targetLicenseeId: string, auditNote?: string, performedBy?: string) {
        await this.assertLicenseeExists(targetLicenseeId);
        const impact = await this.getTransferImpact(regionId);

        const updatedRegion = await prisma.$transaction(async (tx) => {
            const region = await tx.region.findUnique({ where: { id: regionId } });
            if (!region) throw new HttpException(404, 'Region not found');

            const updated = await tx.region.update({
                where: { id: regionId },
                data: {
                    licensee: { connect: { id: targetLicenseeId } },
                    owner_type: 'LICENSEE',
                }
            });

            await tx.company.updateMany({
                where: { region_id: regionId },
                data: {
                    licensee_id: targetLicenseeId,
                    region_owner_type: RegionOwnerType.LICENSEE,
                }
            });

            await tx.auditLog.create({
                data: {
                    entity_type: 'REGION',
                    entity_id: regionId,
                    action: 'TRANSFER_OWNERSHIP',
                    performed_by: performedBy || 'system',
                    description: auditNote || 'Region ownership transferred',
                    changes: {
                        from_licensee_id: region.licensee_id || null,
                        to_licensee_id: targetLicenseeId,
                        impact
                    }
                }
            });

            return updated;
        });

        return {
            region: this.mapToDTO(updatedRegion),
            transferredCounts: impact,
        };
    }
}
