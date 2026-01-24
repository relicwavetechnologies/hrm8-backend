"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyProfileRepository = exports.CompanyProfileRepository = void 0;
const repository_1 = require("../../core/repository");
const DEFAULT_PROFILE_DATA = {
    teamMembers: {
        invites: [],
    },
    additionalLocations: [],
};
class CompanyProfileRepository extends repository_1.BaseRepository {
    async create(companyId, data = {}) {
        const profile = await this.prisma.companyProfile.create({
            data: {
                company_id: companyId,
                profile_data: {
                    ...DEFAULT_PROFILE_DATA,
                    ...data,
                },
            },
        });
        return this.mapPrismaToProfile(profile);
    }
    async findByCompanyId(companyId) {
        const profile = await this.prisma.companyProfile.findUnique({
            where: { company_id: companyId },
        });
        return profile ? this.mapPrismaToProfile(profile) : null;
    }
    async updateByCompanyId(companyId, data) {
        const profile = await this.prisma.companyProfile.update({
            where: { company_id: companyId },
            data,
        });
        return this.mapPrismaToProfile(profile);
    }
    async getOrCreate(companyId) {
        const existing = await this.findByCompanyId(companyId);
        if (existing) {
            return existing;
        }
        return this.create(companyId);
    }
    mapPrismaToProfile(profile) {
        return {
            id: profile.id,
            companyId: profile.company_id,
            status: profile.status,
            completionPercentage: profile.completion_percentage,
            completedSections: profile.completed_sections || [],
            profileData: profile.profile_data || undefined,
            lastReminderAt: profile.last_reminder_at || undefined,
            skipUntil: profile.skip_until || undefined,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at,
        };
    }
}
exports.CompanyProfileRepository = CompanyProfileRepository;
exports.companyProfileRepository = new CompanyProfileRepository();
