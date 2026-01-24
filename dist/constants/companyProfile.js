"use strict";
/**
 * Company Profile Constants
 * Defines onboarding sections, required fields, and helper utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPANY_PROFILE_SECTION_MAP = exports.OPTIONAL_PROFILE_SECTION_KEYS = exports.REQUIRED_PROFILE_SECTION_KEYS = exports.COMPANY_PROFILE_SECTIONS = void 0;
const types_1 = require("../types");
exports.COMPANY_PROFILE_SECTIONS = [
    {
        key: 'basicDetails',
        label: 'Basic Company Details',
        enumValue: types_1.CompanyProfileSection.BASIC_DETAILS,
        required: true,
        description: 'Company name, size, industries, phone, website, and overview.',
    },
    {
        key: 'primaryLocation',
        label: 'Primary Location',
        enumValue: types_1.CompanyProfileSection.PRIMARY_LOCATION,
        required: true,
        description: 'Primary office location and ability to add additional sites.',
    },
    {
        key: 'personalProfile',
        label: 'Personal Profile',
        enumValue: types_1.CompanyProfileSection.PERSONAL_PROFILE,
        required: false,
        description: 'Admin position title, phone number, and preferred location.',
    },
    {
        key: 'teamMembers',
        label: 'Team Members',
        enumValue: types_1.CompanyProfileSection.TEAM_MEMBERS,
        required: false,
        description: 'Invite additional admins/recruiters and set approval levels.',
    },
    {
        key: 'billing',
        label: 'Billing Setup',
        enumValue: types_1.CompanyProfileSection.BILLING,
        required: false,
        description: 'Subscription preference, tax IDs, billing contacts, payment methods.',
    },
    {
        key: 'branding',
        label: 'Branding & Careers Page',
        enumValue: types_1.CompanyProfileSection.BRANDING,
        required: false,
        description: 'Logos, brand color, careers page preferences, and company intro.',
    },
];
exports.REQUIRED_PROFILE_SECTION_KEYS = exports.COMPANY_PROFILE_SECTIONS.filter((section) => section.required).map((section) => section.key);
exports.OPTIONAL_PROFILE_SECTION_KEYS = exports.COMPANY_PROFILE_SECTIONS.filter((section) => !section.required).map((section) => section.key);
exports.COMPANY_PROFILE_SECTION_MAP = exports.COMPANY_PROFILE_SECTIONS.reduce((acc, section) => ({
    ...acc,
    [section.key]: section.enumValue,
}), {});
