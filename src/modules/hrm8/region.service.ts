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
        return this.regionRepository.create(data);
    }

    async getById(id: string) {
        const region = await this.regionRepository.findById(id);
        if (!region) {
            throw new HttpException(404, 'Region not found');
        }
        return region;
    }

    async getAll(filters: any) {
        const { ownerType, licenseeId, regionIds, country } = filters;
        const where: any = {};
        if (ownerType) where.owner_type = ownerType;
        if (licenseeId) where.licensee_id = licenseeId;
        if (regionIds) where.id = { in: regionIds };
        if (country) where.country = country;

        return this.regionRepository.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }

    async update(id: string, data: any) {
        if (data.code) {
            const existing = await this.regionRepository.findByCode(data.code);
            if (existing && existing.id !== id) {
                throw new HttpException(409, 'Region code already exists');
            }
        }
        return this.regionRepository.update(id, data);
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
        const region = await this.getById(id);

        const [companies, jobs, consultants, opportunities] = await Promise.all([
            prisma.company.count({ where: { region_id: id } }),
            prisma.job.count({ where: { region_id: id, status: { in: ['OPEN', 'ON_HOLD'] } } }),
            prisma.consultant.count({ where: { region_id: id, status: 'ACTIVE' } }),
            prisma.opportunity.count({
                where: {
                    company: { region_id: id },
                    stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
                }
            }),
        ]);

        return {
            companies,
            jobs,
            consultants,
            opportunities,
        };
    }

    async transferOwnership(regionId: string, targetLicenseeId: string) {
        const impact = await this.getTransferImpact(regionId);

        const updatedRegion = await this.regionRepository.update(regionId, {
            licensee: { connect: { id: targetLicenseeId } },
            owner_type: 'LICENSEE',
        });

        return {
            region: updatedRegion,
            transferredCounts: impact,
        };
    }
}
