import { BaseService } from '../../core/service';
import { LicenseeRepository } from './licensee.repository';
import { HttpException } from '../../core/http-exception';
import { LicenseeStatus } from '@prisma/client';

export class LicenseeService extends BaseService {
    constructor(private licenseeRepository: LicenseeRepository) {
        super();
    }

    async createLicensee(data: any) {
        return this.licenseeRepository.create({
            name: data.name,
            legal_entity_name: data.legalEntityName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country,
            tax_id: data.taxId,
            agreement_start_date: new Date(data.agreementStartDate),
            agreement_end_date: data.agreementEndDate ? new Date(data.agreementEndDate) : null,
            revenue_share_percent: data.revenueSharePercent || 0,
            exclusivity: data.exclusivity || false,
            contract_file_url: data.contractFileUrl,
            manager_contact: data.managerContact,
            finance_contact: data.financeContact,
            compliance_contact: data.complianceContact,
            status: 'ACTIVE'
        });
    }

    async getAllLicensees(filters: { status?: LicenseeStatus } = {}) {
        return this.licenseeRepository.findAll(filters);
    }

    async getLicensee(id: string) {
        const licensee = await this.licenseeRepository.findById(id);
        if (!licensee) throw new HttpException(404, 'Licensee not found');
        return licensee;
    }

    async updateLicensee(id: string, data: any) {
        await this.getLicensee(id); // Check existence
        return this.licenseeRepository.update(id, data);
    }

    async suspendLicensee(id: string) {
        await this.getLicensee(id);
        return this.licenseeRepository.update(id, { status: 'SUSPENDED' });
    }

    async terminateLicensee(id: string) {
        await this.getLicensee(id);
        return this.licenseeRepository.update(id, { status: 'TERMINATED' });
    }

    async deleteLicensee(id: string) {
        const licensee = await this.getLicensee(id);
        if ((licensee as any).regions && (licensee as any).regions.length > 0) {
            throw new HttpException(400, 'Cannot delete licensee with assigned regions');
        }
        return this.licenseeRepository.delete(id);
    }
}
