import { BaseRepository } from '../../core/repository';
import { Prisma, Region, RegionOwnerType } from '@prisma/client';

export class RegionRepository extends BaseRepository {

    // --- Regions ---
    async findAllRegions(filters?: any): Promise<Region[]> {
        return this.prisma.region.findMany({
            where: filters,
            orderBy: { name: 'asc' },
            include: {
                companies: { select: { id: true } }, // Count via length
                commissions: { select: { id: true } }
            }
        });
    }

    async findRegionById(id: string): Promise<Region | null> {
        return this.prisma.region.findUnique({
            where: { id },
        });
    }

    async createRegion(data: Prisma.RegionCreateInput): Promise<Region> {
        return this.prisma.region.create({ data });
    }

    async updateRegion(id: string, data: Prisma.RegionUpdateInput): Promise<Region> {
        return this.prisma.region.update({
            where: { id },
            data
        });
    }

    async deleteRegion(id: string): Promise<Region> {
        return this.prisma.region.delete({ where: { id } });
    }

    // --- Licensees ---
    // Note: Licensees are HRM8User with role REGIONAL_LICENSEE or specialized entity?
    // Checking schema... Schema has HRM8User.role = HRM8UserRole.
    // There is NO separate Licensee model, but Region has 'licensee_id'.
    // Also HRM8User schema has 'licensee_id' field... wait using 'licensee_id' as a string linking to what?
    // Let's check schema again. Region has 'licensee_id' (String). HRM8User has 'licensee_id' (String).
    // Is Licensee a User? Or a Company? 
    // In `schema.prisma`: `model Region { ... licensee_id String? ... }`. No relation defined for licensee_id.
    // `model HRM8User { ... licensee_id String? ... }`.
    // `model Company { ... licensee_id String? ... }`.
    // It seems 'licensee_id' is an ID of a User (HRM8User with role REGIONAL_LICENSEE) or a separate logical entity not fully related in Prisma?
    // However, `backend/src/controllers/hrm8/RegionalLicenseeController.ts` likely deals with creating users with that role.

    async findLicensees() {
        return this.prisma.hRM8User.findMany({
            where: { role: 'REGIONAL_LICENSEE' }
        });
    }

    async findLicenseeById(id: string) {
        return this.prisma.hRM8User.findUnique({ where: { id } });
    }

    // Create Licensee = Create HRM8User
    // Update Licensee = Update HRM8User
}
