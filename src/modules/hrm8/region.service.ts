import { BaseService } from '../../core/service';
import { RegionRepository } from './region.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import { RegionOwnerType, RevenueStatus } from '@prisma/client';

export class RegionService extends BaseService {
    constructor(private regionRepository: RegionRepository) {
        super();
    }

    async create(data: any) {
        const existing = await this.regionRepository.findByCode(data.code);
        if (existing) {
            throw new HttpException(409, 'Region code already exists');
        }

        const mappedData = {
            ...data,
            state_province: data.stateProvince,
            owner_type: data.ownerType,
            is_active: data.isActive,
        };
        // Remove camelCase keys to avoid "Unknown argument" errors if strict validation is on, 
        // though usually Prisma just ignores unknown fields if not in strict mode, 
        // but clearly here it's complaining.
        delete mappedData.stateProvince;
        delete mappedData.ownerType;
        delete mappedData.isActive;

        return this.regionRepository.create(mappedData);
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

    async getById(id: string) {
        const region = await this.regionRepository.findById(id);
        if (!region) {
            throw new HttpException(404, 'Region not found');
        }
        return this.mapToDTO(region);
    }

    async getAll(filters: any) {
        const { ownerType, licenseeId, regionIds, country } = filters;
        const where: any = {};
        if (ownerType && ownerType !== 'all') where.owner_type = ownerType;
        if (licenseeId) where.licensee_id = licenseeId;
        if (regionIds) where.id = { in: regionIds };
        if (country) where.country = country;

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

    async update(id: string, data: any) {
        if (data.code) {
            const existing = await this.regionRepository.findByCode(data.code);
            if (existing && existing.id !== id) {
                throw new HttpException(409, 'Region code already exists');
            }
        }

        const mappedData = { ...data };
        if (data.stateProvince !== undefined) {
            mappedData.state_province = data.stateProvince;
            delete mappedData.stateProvince;
        }
        if (data.ownerType !== undefined) {
            mappedData.owner_type = data.ownerType;
            delete mappedData.ownerType;
        }
        if (data.isActive !== undefined) {
            mappedData.is_active = data.isActive;
            delete mappedData.isActive;
        }

        return this.regionRepository.update(id, mappedData);
    }

    async delete(id: string) {
        return this.regionRepository.delete(id);
    }

    async assignLicensee(regionId: string, licenseeId: string) {
        return this.regionRepository.assignLicensee(regionId, licenseeId);
    }

    async unassignLicensee(regionId: string) {
        return this.regionRepository.unassignLicensee(regionId);
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
                data: { licensee_id: targetLicenseeId }
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
            region: updatedRegion,
            transferredCounts: impact,
        };
    }
}
