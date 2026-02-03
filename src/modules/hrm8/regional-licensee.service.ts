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

        return { licensees, total };
    }

    async getById(id: string) {
        const licensee = await this.regionalLicenseeRepository.findById(id);
        if (!licensee) throw new HttpException(404, 'Licensee not found');
        return licensee;
    }

    async create(data: any, performedBy?: string) {
        const existing = await this.regionalLicenseeRepository.findByEmail(data.email);
        if (existing) throw new HttpException(409, 'Licensee with this email already exists');

        const licensee = await this.regionalLicenseeRepository.create(data);

        // Create HRM8 user for the licensee
        const password = data.password || 'vAbhi2678';
        const passwordHash = await hashPassword(password);

        await prisma.hRM8User.create({
            data: {
                email: data.email,
                password_hash: passwordHash,
                first_name: data.manager_contact?.split(' ')[0] || data.name,
                last_name: data.manager_contact?.split(' ').slice(1).join(' ') || 'Licensee',
                role: HRM8UserRole.REGIONAL_LICENSEE,
                licensee_id: licensee.id,
            },
        });

        return licensee;
    }

    async update(id: string, data: any) {
        return this.regionalLicenseeRepository.update(id, data);
    }

    async delete(id: string) {
        // Check if it has regions
        const licensee = await this.regionalLicenseeRepository.findById(id);
        if (licensee && (licensee as any).regions?.length > 0) {
            throw new HttpException(400, 'Cannot delete licensee with assigned regions. Unassign regions first.');
        }
        return this.regionalLicenseeRepository.delete(id);
    }

    async updateStatus(id: string, status: LicenseeStatus) {
        if (status === 'SUSPENDED') {
            return this.suspend(id);
        } else if (status === 'TERMINATED') {
            return this.terminate(id);
        }
        return this.regionalLicenseeRepository.update(id, { status });
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
        };
    }
}
