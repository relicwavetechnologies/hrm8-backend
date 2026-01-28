import { BaseService } from '../../core/service';
import { CompanyRepository } from '../company/company.repository';
import { ConsultantRepository } from '../consultant/consultant.repository';

export class ComplianceService extends BaseService {
    private companyRepo: CompanyRepository;
    private consultantRepo: ConsultantRepository;

    constructor() {
        super();
        this.companyRepo = new CompanyRepository();
        this.consultantRepo = new ConsultantRepository();
    }

    async getAlerts() {
        // 1. Unverified Companies (CompanyWhereInput verification_status)
        const unverifiedCompanies = await this.companyRepo.findAll({ verification_status: 'PENDING' });

        // 2. Unverified Consultants (ConsultantWhereInput status)
        // Assuming ConsultantStatus has PENDING or similar. If not, we might need to check logic.
        // Casting to any to avoid strict enum mismatch during quick audit fixes if needed, but trying standard first.
        // Consultant model usually has status field.
        const unverifiedConsultants = await this.consultantRepo.findAll({ status: 'PENDING' });

        // 3. Rejected Companies
        const rejectedCompanies = await this.companyRepo.findAll({ verification_status: 'REJECTED' });

        const alerts = [
            ...unverifiedCompanies.map(c => ({
                id: `comp-verify-${c.id}`,
                type: 'COMPANY_VERIFICATION',
                severity: 'HIGH',
                message: `Company ${c.name} requires verification`,
                entityId: c.id,
                createdAt: c.created_at
            })),
            ...unverifiedConsultants.map(c => ({
                id: `cons-verify-${c.id}`,
                type: 'CONSULTANT_VERIFICATION',
                severity: 'MEDIUM',
                message: `Consultant ${c.first_name} ${c.last_name} requires verification`,
                entityId: c.id,
                createdAt: c.created_at
            })),
            ...rejectedCompanies.map(c => ({
                id: `comp-reject-${c.id}`,
                type: 'COMPANY_REJECTED',
                severity: 'LOW',
                message: `Company ${c.name} was rejected`,
                entityId: c.id,
                createdAt: c.created_at
            }))
        ];

        return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async getSummary() {
        const alerts = await this.getAlerts();
        return {
            totalAlerts: alerts.length,
            highSeverity: alerts.filter(a => a.severity === 'HIGH').length,
            mediumSeverity: alerts.filter(a => a.severity === 'MEDIUM').length,
            lowSeverity: alerts.filter(a => a.severity === 'LOW').length,
            byType: {
                COMPANY_VERIFICATION: alerts.filter(a => a.type === 'COMPANY_VERIFICATION').length,
                CONSULTANT_VERIFICATION: alerts.filter(a => a.type === 'CONSULTANT_VERIFICATION').length,
                COMPANY_REJECTED: alerts.filter(a => a.type === 'COMPANY_REJECTED').length
            }
        };
    }
}
