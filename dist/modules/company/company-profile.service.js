"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyProfileService = exports.CompanyProfileService = void 0;
const service_1 = require("../../core/service");
const crypto_1 = require("crypto");
const types_1 = require("../../types");
const company_profile_repository_1 = require("./company-profile.repository");
const companyProfile_1 = require("../../constants/companyProfile");
const invitation_service_1 = require("../invitation/invitation.service");
const REQUIRED_SECTION_ENUMS = companyProfile_1.COMPANY_PROFILE_SECTIONS.filter((section) => section.required).map((section) => section.enumValue);
function ensureLocationId(location) {
    return {
        id: location.id || (0, crypto_1.randomUUID)(),
        name: location.name?.trim() || '',
        streetAddress: location.streetAddress?.trim() || '',
        city: location.city?.trim() || '',
        stateOrRegion: location.stateOrRegion?.trim() || '',
        postalCode: location.postalCode?.trim() || '',
        country: location.country?.trim() || '',
        isPrimary: location.isPrimary ?? false,
    };
}
class CompanyProfileService extends service_1.BaseService {
    constructor(repository = company_profile_repository_1.companyProfileRepository, invitationServiceRef = invitation_service_1.invitationService) {
        super();
        this.repository = repository;
        this.invitationServiceRef = invitationServiceRef;
    }
    async initializeProfile(companyId) {
        return this.repository.getOrCreate(companyId);
    }
    async getProfile(companyId) {
        return this.repository.getOrCreate(companyId);
    }
    async updateSection(companyId, payload, invitedBy) {
        const profile = await this.repository.getOrCreate(companyId);
        const normalizedData = profile.profileData || {};
        const sectionEnum = companyProfile_1.COMPANY_PROFILE_SECTION_MAP[payload.section];
        if (!sectionEnum) {
            throw new Error(`Unknown section ${payload.section}`);
        }
        const existingTeamMembers = normalizedData.teamMembers || { invites: [] };
        const existingInviteEmails = new Set(existingTeamMembers.invites?.map((invite) => invite.email.toLowerCase()) || []);
        const updatedData = this.applySectionUpdate(normalizedData, payload.section, payload.data);
        if (payload.section === 'teamMembers' && invitedBy) {
            const teamMembersData = updatedData.teamMembers;
            const newInvites = teamMembersData?.invites?.filter((invite) => !existingInviteEmails.has(invite.email.toLowerCase())) || [];
            if (newInvites.length > 0) {
                try {
                    const emails = newInvites.map((invite) => invite.email);
                    // await this.invitationServiceRef.sendInvitations(companyId, invitedBy, { emails });
                    // InvitationService needs sendInvitations method. Stubbed or implemented?
                    // I will need to implement it properly later.
                }
                catch (error) {
                    console.error('Failed to send team member invitations:', error);
                }
            }
        }
        const completedSections = this.calculateCompletedSections(profile.completedSections, payload.section, updatedData, payload.markComplete);
        const status = this.resolveStatus(completedSections);
        const completionPercentage = status === types_1.CompanyProfileStatus.COMPLETED
            ? 100
            : this.calculateCompletionPercentage(completedSections);
        return this.repository.updateByCompanyId(companyId, {
            profile_data: updatedData,
            completed_sections: completedSections,
            status,
            completion_percentage: completionPercentage,
        });
    }
    async completeProfile(companyId) {
        const profile = await this.repository.getOrCreate(companyId);
        const completedSections = new Set(profile.completedSections);
        for (const section of companyProfile_1.COMPANY_PROFILE_SECTIONS) {
            const key = section.key;
            const hasData = this.sectionHasRequiredData(profile.profileData || {}, key);
            if (hasData) {
                completedSections.add(section.enumValue);
            }
            else if (section.required) {
                throw new Error(`Section ${section.label} is required before completion.`);
            }
        }
        const status = this.resolveStatus(Array.from(completedSections));
        const completionPercentage = status === types_1.CompanyProfileStatus.COMPLETED
            ? 100
            : this.calculateCompletionPercentage(Array.from(completedSections));
        return this.repository.updateByCompanyId(profile.companyId, {
            completed_sections: Array.from(completedSections),
            status,
            completion_percentage: completionPercentage,
        });
    }
    async getProgress(companyId) {
        const profile = await this.repository.getOrCreate(companyId);
        // Sync invitation statuses
        // const invitations = await this.invitationServiceRef.getCompanyInvitations(companyId);
        // TODO: Implement getCompanyInvitations in InvitationService
        const invitations = []; // Stub for now
        const invitationStatusMap = new Map();
        invitations.forEach((invitation) => {
            const email = invitation.email.toLowerCase();
            let status = 'pending';
            if (invitation.status === 'ACCEPTED') {
                status = 'accepted';
            }
            else if (invitation.status === 'CANCELLED' || invitation.status === 'EXPIRED') {
                status = 'declined';
            }
            const existingStatus = invitationStatusMap.get(email);
            if (status === 'accepted') {
                invitationStatusMap.set(email, status);
            }
            else if (!existingStatus) {
                invitationStatusMap.set(email, status);
            }
        });
        if (profile.profileData?.teamMembers?.invites) {
            let hasChanges = false;
            const updatedInvites = profile.profileData.teamMembers.invites.map((invite) => {
                const email = invite.email.toLowerCase();
                const actualStatus = invitationStatusMap.get(email);
                if (actualStatus && invite.status !== actualStatus) {
                    hasChanges = true;
                    return {
                        ...invite,
                        status: actualStatus,
                    };
                }
                return invite;
            });
            if (hasChanges) {
                const updatedProfileData = {
                    ...profile.profileData,
                    teamMembers: {
                        ...profile.profileData.teamMembers,
                        invites: updatedInvites,
                    },
                };
                await this.repository.updateByCompanyId(companyId, {
                    profile_data: updatedProfileData,
                });
                const updatedProfile = await this.repository.getOrCreate(companyId);
                return {
                    profile: updatedProfile,
                    requiredSections: companyProfile_1.REQUIRED_PROFILE_SECTION_KEYS,
                    optionalSections: companyProfile_1.OPTIONAL_PROFILE_SECTION_KEYS,
                };
            }
        }
        return {
            profile,
            requiredSections: companyProfile_1.REQUIRED_PROFILE_SECTION_KEYS,
            optionalSections: companyProfile_1.OPTIONAL_PROFILE_SECTION_KEYS,
        };
    }
    async getProfileSummary(companyId) {
        const profile = await this.repository.getOrCreate(companyId);
        return {
            status: profile.status,
            completionPercentage: profile.completionPercentage,
            completedSections: profile.completedSections,
            requiredSections: companyProfile_1.REQUIRED_PROFILE_SECTION_KEYS,
            optionalSections: companyProfile_1.OPTIONAL_PROFILE_SECTION_KEYS,
        };
    }
    // Private helper methods (validation, etc.)
    applySectionUpdate(existingData, section, data) {
        switch (section) {
            case 'basicDetails':
                return {
                    ...existingData,
                    basicDetails: this.validateBasicDetails({
                        ...(existingData.basicDetails || {}),
                        ...data,
                    }),
                };
            case 'primaryLocation': {
                const normalized = this.validateLocationSection(data);
                return {
                    ...existingData,
                    primaryLocation: normalized.primary,
                    additionalLocations: normalized.additional,
                };
            }
            case 'personalProfile':
                return {
                    ...existingData,
                    personalProfile: this.validatePersonalProfile({
                        ...(existingData.personalProfile || {}),
                        ...data,
                    }),
                };
            case 'teamMembers':
                return {
                    ...existingData,
                    teamMembers: this.validateTeamMembers(data),
                };
            case 'billing':
                return {
                    ...existingData,
                    billing: this.validateBillingSection({
                        ...(existingData.billing || {}),
                        ...data,
                    }),
                };
            case 'branding':
                return {
                    ...existingData,
                    branding: this.validateBrandingSection({
                        ...(existingData.branding || {}),
                        ...data,
                    }),
                };
            default:
                return existingData;
        }
    }
    validateBasicDetails(data) {
        if (!data) {
            throw new Error('Basic details payload is required.');
        }
        if (!data.companyName || data.companyName.trim().length < 2) {
            throw new Error('Company name is required.');
        }
        if (!data.companySize) {
            throw new Error('Company size is required.');
        }
        if (!Array.isArray(data.industries) || data.industries.length === 0) {
            throw new Error('At least one industry is required.');
        }
        if (!data.phone || !data.phone.number || !data.phone.countryCode) {
            throw new Error('Company phone number (with country code) is required.');
        }
        if (data.industries.length > 3) {
            throw new Error('You can select up to 3 industries.');
        }
        return {
            companyName: data.companyName.trim(),
            companySize: data.companySize,
            industries: data.industries.map((industry) => industry.trim()),
            phone: data.phone,
            websiteUrl: data.websiteUrl?.trim(),
            yearFounded: data.yearFounded,
            overview: data.overview?.trim(),
            logoUrl: data.logoUrl,
            iconUrl: data.iconUrl,
        };
    }
    validateLocationSection(payload) {
        const data = payload;
        if (!data.primary) {
            throw new Error('Primary location is required.');
        }
        const primary = ensureLocationId({ ...data.primary, isPrimary: true });
        this.assertLocation(primary, true);
        const additional = data.additional?.map((loc) => {
            const next = ensureLocationId({ ...loc, isPrimary: false });
            this.assertLocation(next);
            return next;
        }) || [];
        return { primary, additional };
    }
    assertLocation(location, isPrimary = false) {
        const missing = [];
        if (!location.name)
            missing.push('Location name');
        if (!location.streetAddress)
            missing.push('Street address');
        if (!location.city)
            missing.push('City');
        if (!location.stateOrRegion)
            missing.push('State/Region');
        if (!location.postalCode)
            missing.push('Zip/Postcode');
        if (!location.country)
            missing.push('Country');
        if (missing.length > 0) {
            throw new Error(`${isPrimary ? 'Primary location' : 'Location'} is missing fields: ${missing.join(', ')}`);
        }
    }
    validatePersonalProfile(data) {
        if (data.phone && (!data.phone.number || !data.phone.countryCode)) {
            throw new Error('Personal profile phone must include country code and number.');
        }
        return {
            positionTitle: data.positionTitle?.trim(),
            phone: data.phone,
            location: data.location?.trim(),
        };
    }
    validateTeamMembers(data) {
        const invites = Array.isArray(data.invites) ? data.invites : [];
        const sanitizedInvites = invites.map((invite) => {
            if (!invite.email) {
                throw new Error('Invite email is required.');
            }
            return {
                email: String(invite.email).toLowerCase().trim(),
                role: invite.role || 'member',
                authorizationLevel: invite.authorizationLevel,
                approvalLevel: invite.approvalLevel,
                status: invite.status || 'pending',
            };
        });
        const defaultAdminId = typeof data.defaultAdminId === 'string'
            ? data.defaultAdminId
            : undefined;
        return {
            invites: sanitizedInvites,
            defaultAdminId,
        };
    }
    validateBillingSection(data) {
        if (data.paymentPreference && !['payg', 'subscription'].includes(data.paymentPreference)) {
            throw new Error('Payment preference must be PAYG or Subscription.');
        }
        if (data.accountsEmail && !data.accountsEmail.includes('@')) {
            throw new Error('Accounts email must be a valid email address.');
        }
        return {
            paymentPreference: data.paymentPreference,
            subscriptionPlan: data.subscriptionPlan,
            registeredBusinessName: data.registeredBusinessName?.trim(),
            taxId: data.taxId?.trim(),
            registeredCountry: data.registeredCountry?.trim(),
            isCharity: data.isCharity,
            supportingDocuments: data.supportingDocuments,
            paymentMethod: data.paymentMethod,
            billingAddress: data.billingAddress,
            accountsEmail: data.accountsEmail?.trim(),
        };
    }
    validateBrandingSection(data) {
        if (data.subdomain && !/^[a-z0-9-]+$/i.test(data.subdomain)) {
            throw new Error('Subdomain can include only letters, numbers, and hyphens.');
        }
        return {
            careersPageEnabled: data.careersPageEnabled,
            subdomain: data.subdomain?.toLowerCase(),
            brandColor: data.brandColor,
            companyIntroduction: data.companyIntroduction?.trim(),
            logoUrl: data.logoUrl,
            iconUrl: data.iconUrl,
        };
    }
    sectionHasRequiredData(profileData, section) {
        switch (section) {
            case 'basicDetails':
                return Boolean(profileData.basicDetails &&
                    profileData.basicDetails.companyName &&
                    profileData.basicDetails.companySize &&
                    profileData.basicDetails.industries?.length &&
                    profileData.basicDetails.phone);
            case 'primaryLocation':
                return Boolean(profileData.primaryLocation &&
                    profileData.primaryLocation.streetAddress &&
                    profileData.primaryLocation.city &&
                    profileData.primaryLocation.country);
            default:
                return Boolean(profileData[section]);
        }
    }
    calculateCompletedSections(currentSections, sectionKey, profileData, markComplete) {
        const nextSections = new Set(currentSections);
        const enumValue = companyProfile_1.COMPANY_PROFILE_SECTION_MAP[sectionKey];
        if (markComplete || this.sectionHasRequiredData(profileData, sectionKey)) {
            nextSections.add(enumValue);
        }
        else {
            nextSections.delete(enumValue);
        }
        return Array.from(nextSections);
    }
    resolveStatus(completedSections) {
        if (completedSections.length === 0) {
            return types_1.CompanyProfileStatus.NOT_STARTED;
        }
        const completedSet = new Set(completedSections);
        const hasAllRequired = REQUIRED_SECTION_ENUMS.every((section) => completedSet.has(section));
        return hasAllRequired ? types_1.CompanyProfileStatus.COMPLETED : types_1.CompanyProfileStatus.IN_PROGRESS;
    }
    calculateCompletionPercentage(sections) {
        if (companyProfile_1.COMPANY_PROFILE_SECTIONS.length === 0) {
            return 0;
        }
        return Math.round((sections.length / companyProfile_1.COMPANY_PROFILE_SECTIONS.length) * 100);
    }
}
exports.CompanyProfileService = CompanyProfileService;
exports.companyProfileService = new CompanyProfileService();
