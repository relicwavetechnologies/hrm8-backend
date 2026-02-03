import { BaseService } from '../../core/service';
import { Hrm8Repository } from './hrm8.repository';
import { RegionalLicenseeRepository } from './regional-licensee.repository';
import { HttpException } from '../../core/http-exception';
import type { HRM8User, Prisma } from '@prisma/client';

export interface Hrm8ProfileUserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  photo?: string | null;
  role: string;
  status: string;
  licenseeId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
}

export interface RegionalLicenseeDTO {
  id: string;
  name: string;
  legalEntityName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  taxId?: string | null;
  agreementStartDate: Date;
  agreementEndDate?: Date | null;
  revenueSharePercent: number;
  exclusivity: boolean;
  contractFileUrl?: string | null;
  managerContact: string;
  financeContact?: string | null;
  complianceContact?: string | null;
  status: string;
  regions?: Array<{
    id: string;
    name: string;
    code: string;
    country: string;
    stateProvince?: string | null;
    city?: string | null;
    isActive: boolean;
    ownerType: string;
  }>;
}

export interface Hrm8ProfileDTO {
  user: Hrm8ProfileUserDTO;
  licensee?: RegionalLicenseeDTO | null;
}

interface Hrm8ProfileUpdatePayload {
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    photo?: string | null;
  };
  licensee?: {
    name?: string;
    legalEntityName?: string;
    email?: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    taxId?: string | null;
    agreementStartDate?: Date | string | null;
    agreementEndDate?: Date | string | null;
    revenueSharePercent?: number;
    exclusivity?: boolean;
    contractFileUrl?: string | null;
    managerContact?: string;
    financeContact?: string | null;
    complianceContact?: string | null;
    status?: string;
  };
}

export class Hrm8ProfileService extends BaseService {
  constructor(
    private hrm8Repository: Hrm8Repository,
    private regionalLicenseeRepository: RegionalLicenseeRepository
  ) {
    super();
  }

  private mapUserToDTO(user: HRM8User): Hrm8ProfileUserDTO {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      photo: user.photo,
      role: user.role,
      status: user.status,
      licenseeId: user.licensee_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at,
    };
  }

  private mapLicenseeToDTO(licensee: any): RegionalLicenseeDTO {
    return {
      id: licensee.id,
      name: licensee.name,
      legalEntityName: licensee.legal_entity_name,
      email: licensee.email,
      phone: licensee.phone,
      address: licensee.address,
      city: licensee.city,
      state: licensee.state,
      country: licensee.country,
      taxId: licensee.tax_id,
      agreementStartDate: licensee.agreement_start_date,
      agreementEndDate: licensee.agreement_end_date,
      revenueSharePercent: licensee.revenue_share_percent,
      exclusivity: licensee.exclusivity,
      contractFileUrl: licensee.contract_file_url,
      managerContact: licensee.manager_contact,
      financeContact: licensee.finance_contact,
      complianceContact: licensee.compliance_contact,
      status: licensee.status,
      regions: Array.isArray(licensee.regions)
        ? licensee.regions.map((region: any) => ({
            id: region.id,
            name: region.name,
            code: region.code,
            country: region.country,
            stateProvince: region.state_province,
            city: region.city,
            isActive: region.is_active,
            ownerType: region.owner_type,
          }))
        : [],
    };
  }

  private mapLicenseeToPersistence(data: Hrm8ProfileUpdatePayload['licensee']) {
    if (!data) return {};
    const mapped: Record<string, unknown> = {};

    if (data.name !== undefined) mapped.name = data.name;
    if (data.legalEntityName !== undefined) mapped.legal_entity_name = data.legalEntityName;
    if (data.email !== undefined) mapped.email = data.email;
    if (data.phone !== undefined) mapped.phone = data.phone;
    if (data.address !== undefined) mapped.address = data.address;
    if (data.city !== undefined) mapped.city = data.city;
    if (data.state !== undefined) mapped.state = data.state;
    if (data.country !== undefined) mapped.country = data.country;
    if (data.taxId !== undefined) mapped.tax_id = data.taxId;
    if (data.agreementStartDate !== undefined) mapped.agreement_start_date = data.agreementStartDate;
    if (data.agreementEndDate !== undefined) mapped.agreement_end_date = data.agreementEndDate;
    if (data.revenueSharePercent !== undefined) mapped.revenue_share_percent = data.revenueSharePercent;
    if (data.exclusivity !== undefined) mapped.exclusivity = data.exclusivity;
    if (data.contractFileUrl !== undefined) mapped.contract_file_url = data.contractFileUrl;
    if (data.managerContact !== undefined) mapped.manager_contact = data.managerContact;
    if (data.financeContact !== undefined) mapped.finance_contact = data.financeContact;
    if (data.complianceContact !== undefined) mapped.compliance_contact = data.complianceContact;
    if (data.status !== undefined) mapped.status = data.status;

    return mapped;
  }

  async getProfile(userId: string): Promise<Hrm8ProfileDTO> {
    const user = await this.hrm8Repository.findById(userId);
    if (!user) throw new HttpException(404, 'User not found');

    let licensee: RegionalLicenseeDTO | null = null;
    if (user.role === 'REGIONAL_LICENSEE' && user.licensee_id) {
      const licenseeEntity = await this.regionalLicenseeRepository.findById(user.licensee_id);
      if (!licenseeEntity) throw new HttpException(404, 'Licensee not found');
      licensee = this.mapLicenseeToDTO(licenseeEntity);
    }

    return {
      user: this.mapUserToDTO(user),
      licensee,
    };
  }

  async updateProfile(userId: string, payload: Hrm8ProfileUpdatePayload): Promise<Hrm8ProfileDTO> {
    const user = await this.hrm8Repository.findById(userId);
    if (!user) throw new HttpException(404, 'User not found');

    if (payload.user?.email && payload.user.email !== user.email) {
      const existing = await this.hrm8Repository.findByEmail(payload.user.email);
      if (existing) throw new HttpException(409, 'Email already in use');
    }

    const userUpdates: Prisma.HRM8UserUpdateInput = {};
    if (payload.user?.firstName !== undefined) userUpdates.first_name = payload.user.firstName;
    if (payload.user?.lastName !== undefined) userUpdates.last_name = payload.user.lastName;
    if (payload.user?.email !== undefined) userUpdates.email = payload.user.email;
    if (payload.user?.phone !== undefined) userUpdates.phone = payload.user.phone;
    if (payload.user?.photo !== undefined) userUpdates.photo = payload.user.photo;

    if (Object.keys(userUpdates).length > 0) {
      await this.hrm8Repository.update(userId, userUpdates);
    }

    if (payload.licensee && user.role === 'REGIONAL_LICENSEE' && user.licensee_id) {
      const licenseeUpdates = this.mapLicenseeToPersistence(payload.licensee);
      if (Object.keys(licenseeUpdates).length > 0) {
        await this.regionalLicenseeRepository.update(user.licensee_id, licenseeUpdates);
      }
    }

    return this.getProfile(userId);
  }
}
