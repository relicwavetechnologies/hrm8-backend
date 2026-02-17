"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hrm8Service = void 0;
const service_1 = require("../../core/service");
const password_1 = require("../../utils/password");
const http_exception_1 = require("../../core/http-exception");
const session_1 = require("../../utils/session");
class Hrm8Service extends service_1.BaseService {
    constructor(hrm8Repository) {
        super();
        this.hrm8Repository = hrm8Repository;
    }
    async login(data) {
        const user = await this.hrm8Repository.findByEmail(data.email);
        if (!user) {
            throw new http_exception_1.HttpException(401, 'Invalid credentials');
        }
        const isValid = await (0, password_1.comparePassword)(data.password, user.password_hash);
        if (!isValid) {
            throw new http_exception_1.HttpException(401, 'Invalid credentials');
        }
        if (user.status !== 'ACTIVE') {
            throw new http_exception_1.HttpException(403, 'Account is inactive');
        }
        const sessionId = (0, session_1.generateSessionId)();
        const expiresAt = (0, session_1.getSessionExpiration)(7 * 24); // 7 days
        await this.hrm8Repository.createSession({
            session_id: sessionId,
            user: { connect: { id: user.id } },
            email: user.email,
            expires_at: expiresAt,
        });
        let regionIds = [];
        if (user.role === 'REGIONAL_LICENSEE' && user.licensee_id) {
            const regions = await this.hrm8Repository.getRegionsForLicensee(user.licensee_id);
            regionIds = regions.map(r => r.id);
        }
        return { user, sessionId, regionIds };
    }
    async logout(sessionId) {
        await this.hrm8Repository.deleteSession(sessionId);
    }
    async getProfile(userId) {
        const user = await this.hrm8Repository.findById(userId);
        if (!user)
            throw new http_exception_1.HttpException(404, 'User not found');
        let regionIds = [];
        if (user.role === 'REGIONAL_LICENSEE' && user.licensee_id) {
            const regions = await this.hrm8Repository.getRegionsForLicensee(user.licensee_id);
            regionIds = regions.map(r => r.id);
        }
        return { user, regionIds };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.hrm8Repository.findById(userId);
        if (!user)
            throw new http_exception_1.HttpException(404, 'User not found');
        const isValid = await (0, password_1.comparePassword)(currentPassword, user.password_hash);
        if (!isValid)
            throw new http_exception_1.HttpException(400, 'Current password is incorrect');
        const passwordHash = await (0, password_1.hashPassword)(newPassword);
        await this.hrm8Repository.update(userId, { password_hash: passwordHash });
    }
    async getProfileDetail(userId) {
        const user = await this.hrm8Repository.findById(userId);
        if (!user)
            throw new http_exception_1.HttpException(404, 'User not found');
        const licensee = user.licensee_id && user.role === 'REGIONAL_LICENSEE'
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
    async updateProfileDetail(userId, payload) {
        const currentUser = await this.hrm8Repository.findById(userId);
        if (!currentUser)
            throw new http_exception_1.HttpException(404, 'User not found');
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
exports.Hrm8Service = Hrm8Service;
