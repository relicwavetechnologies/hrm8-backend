import { BaseService } from '../../core/service';
import { Hrm8Repository } from './hrm8.repository';
import { HRM8User } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { HttpException } from '../../core/http-exception';
import { generateSessionId, getSessionExpiration } from '../../utils/session';

export class Hrm8Service extends BaseService {
  constructor(private hrm8Repository: Hrm8Repository) {
    super();
  }

  async login(data: { email: string; password: string }) {
    const user = await this.hrm8Repository.findByEmail(data.email);
    if (!user) {
      throw new HttpException(401, 'Invalid credentials');
    }

    const isValid = await comparePassword(data.password, user.password_hash);
    if (!isValid) {
      throw new HttpException(401, 'Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new HttpException(403, 'Account is inactive');
    }

    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiration(7 * 24); // 7 days

    await this.hrm8Repository.createSession({
      session_id: sessionId,
      user: { connect: { id: user.id } },
      email: user.email,
      expires_at: expiresAt,
    });

    let regionIds: string[] = [];
    if (user.role === 'REGIONAL_LICENSEE' && user.licensee_id) {
      const regions = await this.hrm8Repository.getRegionsForLicensee(user.licensee_id);
      regionIds = regions.map(r => r.id);
    }

    return { user, sessionId, regionIds };
  }

  async logout(sessionId: string) {
    await this.hrm8Repository.deleteSession(sessionId);
  }

  async getProfile(userId: string) {
    const user = await this.hrm8Repository.findById(userId);
    if (!user) throw new HttpException(404, 'User not found');

    let regionIds: string[] = [];
    if (user.role === 'REGIONAL_LICENSEE' && user.licensee_id) {
      const regions = await this.hrm8Repository.getRegionsForLicensee(user.licensee_id);
      regionIds = regions.map(r => r.id);
    }

    return { user, regionIds };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.hrm8Repository.findById(userId);
    if (!user) throw new HttpException(404, 'User not found');

    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) throw new HttpException(400, 'Current password is incorrect');

    const passwordHash = await hashPassword(newPassword);
    await this.hrm8Repository.update(userId, { password_hash: passwordHash });
  }

  async getProfileDetail(userId: string) {
    const user = await this.hrm8Repository.findById(userId);
    if (!user) throw new HttpException(404, 'User not found');

    const licensee =
      user.licensee_id && user.role === 'REGIONAL_LICENSEE'
        ? await this.hrm8Repository.findLicenseeById(user.licensee_id)
        : null;

    return {
      profile: {
        user: {
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
        },
        licensee: licensee
          ? {
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
              regions: (licensee.regions || []).map((region) => ({
                id: region.id,
                name: region.name,
                code: region.code,
                country: region.country,
                stateProvince: region.state_province,
                city: region.city,
                isActive: region.is_active,
                ownerType: region.owner_type,
              })),
            }
          : null,
      },
    };
  }

  async updateProfileDetail(
    userId: string,
    payload: {
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
        agreementStartDate?: string | null;
        agreementEndDate?: string | null;
        revenueSharePercent?: number;
        exclusivity?: boolean;
        contractFileUrl?: string | null;
        managerContact?: string;
        financeContact?: string | null;
        complianceContact?: string | null;
        status?: string;
      };
    }
  ) {
    const currentUser = await this.hrm8Repository.findById(userId);
    if (!currentUser) throw new HttpException(404, 'User not found');

    if (payload.user) {
      await this.hrm8Repository.update(userId, {
        ...(payload.user.email !== undefined ? { email: payload.user.email } : {}),
        ...(payload.user.firstName !== undefined ? { first_name: payload.user.firstName } : {}),
        ...(payload.user.lastName !== undefined ? { last_name: payload.user.lastName } : {}),
        ...(payload.user.phone !== undefined ? { phone: payload.user.phone } : {}),
        ...(payload.user.photo !== undefined ? { photo: payload.user.photo } : {}),
      });
    }

    if (payload.licensee && currentUser.role === 'REGIONAL_LICENSEE' && currentUser.licensee_id) {
      await this.hrm8Repository.updateLicensee(currentUser.licensee_id, {
        ...(payload.licensee.name !== undefined ? { name: payload.licensee.name } : {}),
        ...(payload.licensee.legalEntityName !== undefined
          ? { legal_entity_name: payload.licensee.legalEntityName }
          : {}),
        ...(payload.licensee.email !== undefined ? { email: payload.licensee.email } : {}),
        ...(payload.licensee.phone !== undefined ? { phone: payload.licensee.phone } : {}),
        ...(payload.licensee.address !== undefined ? { address: payload.licensee.address } : {}),
        ...(payload.licensee.city !== undefined ? { city: payload.licensee.city } : {}),
        ...(payload.licensee.state !== undefined ? { state: payload.licensee.state } : {}),
        ...(payload.licensee.country !== undefined ? { country: payload.licensee.country } : {}),
        ...(payload.licensee.taxId !== undefined ? { tax_id: payload.licensee.taxId } : {}),
        ...(payload.licensee.agreementStartDate !== undefined
          ? payload.licensee.agreementStartDate
            ? {
                agreement_start_date: new Date(payload.licensee.agreementStartDate),
              }
            : {}
          : {}),
        ...(payload.licensee.agreementEndDate !== undefined
          ? {
              agreement_end_date: payload.licensee.agreementEndDate
                ? new Date(payload.licensee.agreementEndDate)
                : null,
            }
          : {}),
        ...(payload.licensee.revenueSharePercent !== undefined
          ? { revenue_share_percent: payload.licensee.revenueSharePercent }
          : {}),
        ...(payload.licensee.exclusivity !== undefined ? { exclusivity: payload.licensee.exclusivity } : {}),
        ...(payload.licensee.contractFileUrl !== undefined
          ? { contract_file_url: payload.licensee.contractFileUrl }
          : {}),
        ...(payload.licensee.managerContact !== undefined ? { manager_contact: payload.licensee.managerContact } : {}),
        ...(payload.licensee.financeContact !== undefined ? { finance_contact: payload.licensee.financeContact } : {}),
        ...(payload.licensee.complianceContact !== undefined
          ? { compliance_contact: payload.licensee.complianceContact }
          : {}),
      });
    }

    return this.getProfileDetail(userId);
  }
}
