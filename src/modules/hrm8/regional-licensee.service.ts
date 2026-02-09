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
