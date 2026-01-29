import { BaseService } from '../../core/service';
import { RegionRepository } from './region.repository';
import { HttpException } from '../../core/http-exception';
import { RegionOwnerType } from '@prisma/client';

export class RegionService extends BaseService {
    constructor(private regionRepository: RegionRepository) {
        super();
    }

    // --- Regions ---
    async getAllRegions() {
        return this.regionRepository.findAllRegions();
    }

    async createRegion(data: any) {
        const existing = await this.regionRepository.findAllRegions({ code: data.code });
        if (existing.length > 0) throw new HttpException(409, 'Region code already exists');

        return this.regionRepository.createRegion({
            name: data.name,
            code: data.code,
            country: data.country,
            state_province: data.state,
            city: data.city,
            boundaries: data.boundaries,
            owner_type: data.ownerType || 'HRM8',
            monthly_placement_target: data.monthlyPlacementTarget,
            monthly_revenue_target: data.monthlyRevenueTarget
        });
    }

    async getRegion(id: string) {
        const region = await this.regionRepository.findRegionById(id);
        if (!region) throw new HttpException(404, 'Region not found');
        return region;
    }

    async updateRegion(id: string, data: any) {
        await this.getRegion(id); // Check existence
        return this.regionRepository.updateRegion(id, data);
    }

    async deleteRegion(id: string) {
        // Check for dependencies (companies, consultants assigned)
        // For now, simpler implementation
        return this.regionRepository.deleteRegion(id);
    }

    async assignLicensee(regionId: string, licenseeId: string) {
        const region = await this.getRegion(regionId);
        // Validate licensee exists...
        return this.regionRepository.updateRegion(regionId, {
            licensee_id: licenseeId,
            owner_type: 'LICENSEE'
        } as any);
    }

    async unassignLicensee(regionId: string) {
        return this.regionRepository.updateRegion(regionId, {
            licensee_id: null,
            owner_type: 'HRM8'
        } as any);
    }

    // --- Licensees ---
    async getLicensees() {
        return this.regionRepository.findLicensees();
    }

    // Implementation of suspension, termination etc. would update User status
    // Assuming HRM8User has status field (ACTIVE, SUSPENDED etc)
}
