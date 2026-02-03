import { BaseService } from '../../core/service';
import { CompanyRepository } from './company.repository';
import { Company, CompanyVerificationStatus, VerificationMethod, JobAssignmentMode } from '@prisma/client';
import { HttpException } from '../../core/http-exception';

export class CompanyService extends BaseService {
  constructor(private companyRepository: CompanyRepository) {
    super();
  }

  async createCompany(data: {
    name: string;
    domain: string;
    website: string;
    countryOrRegion?: string;
    acceptedTerms?: boolean;
    verificationStatus?: CompanyVerificationStatus;
    verificationMethod?: VerificationMethod;
    verificationData?: any;
    regionId?: string;
    referredBy?: string;
    salesAgentId?: string;
  }): Promise<Company> {
    const domain = data.domain.toLowerCase();
    
    // Check if domain exists
    const exists = await this.companyRepository.countByDomain(domain);
    if (exists > 0) {
      throw new HttpException(409, `Company with domain "${domain}" already exists.`);
    }

    return this.companyRepository.create({
      name: data.name,
      domain: domain,
      website: data.website,
      country_or_region: data.countryOrRegion,
      accepted_terms: data.acceptedTerms,
      verification_status: data.verificationStatus || 'PENDING',
      verification_method: data.verificationMethod,
      verified_at: data.verificationData?.verifiedAt,
      verified_by: data.verificationData?.verifiedBy,
      gst_number: data.verificationData?.gstNumber,
      registration_number: data.verificationData?.registrationNumber,
      linked_in_url: data.verificationData?.linkedInUrl,
      region: data.regionId ? { connect: { id: data.regionId } } : undefined,
      sales_agent: data.salesAgentId ? { connect: { id: data.salesAgentId } } : undefined,
    });
  }

  async updateCompany(id: string, data: any) {
    const company = await this.companyRepository.findById(id);
    if (!company) throw new HttpException(404, 'Company not found');

    return this.companyRepository.update(id, data);
  }

  async getCompany(id: string) {
    const company = await this.companyRepository.findById(id);
    if (!company) throw new HttpException(404, 'Company not found');
    return company;
  }

  async getCompanyByDomain(domain: string) {
    return this.companyRepository.findByDomain(domain);
  }

  // --- Profile ---

  async getProfile(companyId: string) {
    const profile = await this.companyRepository.findProfileByCompanyId(companyId);
    if (!profile) {
      // Auto-create empty profile if not exists
      return this.companyRepository.createProfile({
        company: { connect: { id: companyId } },
        status: 'NOT_STARTED',
        profile_data: { teamMembers: { invites: [] }, additionalLocations: [] },
      });
    }
    return profile;
  }

  async updateProfile(companyId: string, data: any) {
    return this.companyRepository.upsertProfile(
      companyId,
      {
        company: { connect: { id: companyId } },
        ...data
      },
      data
    );
  }

  // --- Verification ---

  async updateVerificationStatus(
    id: string, 
    status: CompanyVerificationStatus, 
    method?: VerificationMethod
  ) {
    const updateData: any = { verification_status: status };
    if (method) updateData.verification_method = method;
    if (status === 'VERIFIED') updateData.verified_at = new Date();

    return this.companyRepository.update(id, updateData);
  }

  // --- Settings ---

  async getJobAssignmentSettings(id: string) {
    const company = await this.companyRepository.findById(id);
    if (!company) throw new HttpException(404, 'Company not found');

    return {
      jobAssignmentMode: company.job_assignment_mode,
      preferredRecruiterId: company.preferred_recruiter_id,
    };
  }

  async updateJobAssignmentMode(id: string, mode: JobAssignmentMode) {
    return this.companyRepository.update(id, { job_assignment_mode: mode });
  }

  // --- Transactions ---

  async getTransactions(companyId: string, limit?: number, offset?: number) {
    const company = await this.companyRepository.findById(companyId);
    if (!company) throw new HttpException(404, 'Company not found');

    return this.companyRepository.findTransactions(companyId, limit, offset);
  }

  async getTransactionStats(companyId: string) {
    const company = await this.companyRepository.findById(companyId);
    if (!company) throw new HttpException(404, 'Company not found');

    return this.companyRepository.getTransactionStats(companyId);
  }

  // --- Refund Requests ---

  async createRefundRequest(companyId: string, data: {
    amount: number;
    reason: string;
    description?: string;
    invoiceNumber?: string;
  }) {
    const company = await this.companyRepository.findById(companyId);
    if (!company) throw new HttpException(404, 'Company not found');

    if (!data.amount || data.amount <= 0) {
      throw new HttpException(400, 'Amount must be greater than 0');
    }

    if (!data.reason) {
      throw new HttpException(400, 'Reason is required');
    }

    return this.companyRepository.createRefundRequest({
      company: { connect: { id: companyId } },
      amount: data.amount,
      reason: data.reason,
      description: data.description,
      invoice_number: data.invoiceNumber,
      status: 'PENDING'
    });
  }

  async getRefundRequests(companyId: string, limit?: number, offset?: number) {
    const company = await this.companyRepository.findById(companyId);
    if (!company) throw new HttpException(404, 'Company not found');

    return this.companyRepository.findRefundRequests(
      { company_id: companyId },
      limit,
      offset
    );
  }

  async cancelRefundRequest(requestId: string, companyId: string) {
    const request = await this.companyRepository.findRefundRequestById(requestId);
    if (!request) throw new HttpException(404, 'Refund request not found');

    if (request.company_id !== companyId) {
      throw new HttpException(403, 'Unauthorized');
    }

    if (request.status !== 'PENDING') {
      throw new HttpException(400, `Cannot cancel a ${request.status} refund request`);
    }

    return this.companyRepository.deleteRefundRequest(requestId);
  }

  async withdrawRefundRequest(requestId: string, companyId: string) {
    const request = await this.companyRepository.findRefundRequestById(requestId);
    if (!request) throw new HttpException(404, 'Refund request not found');

    if (request.company_id !== companyId) {
      throw new HttpException(403, 'Unauthorized');
    }

    if (request.status !== 'PENDING') {
      throw new HttpException(400, `Cannot withdraw a ${request.status} refund request`);
    }

    return this.companyRepository.updateRefundRequest(requestId, {
      status: 'WITHDRAWN',
      withdrawn_at: new Date()
    });
  }
}
