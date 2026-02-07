import { BaseService } from '../../core/service';
import { RegionRepository } from './region.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import { RegionOwnerType } from '@prisma/client';

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
