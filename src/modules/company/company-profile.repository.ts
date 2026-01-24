import { BaseRepository } from '../../core/repository';
import { CompanyProfile, CompanyProfileData, CompanyProfileStatus, CompanyProfileSection } from '../../types';
import { Prisma } from '@prisma/client';

const DEFAULT_PROFILE_DATA: CompanyProfileData = {
  teamMembers: {
    invites: [],
  },
  additionalLocations: [],
};

export class CompanyProfileRepository extends BaseRepository {
  async create(companyId: string, data: Partial<CompanyProfileData> = {}): Promise<CompanyProfile> {
    const profile = await this.prisma.companyProfile.create({
      data: {
        company_id: companyId,
        profile_data: {
          ...DEFAULT_PROFILE_DATA,
          ...data,
        } as Prisma.JsonObject,
      },
    });

    return this.mapPrismaToProfile(profile);
  }

  async findByCompanyId(companyId: string): Promise<CompanyProfile | null> {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { company_id: companyId },
    });

    return profile ? this.mapPrismaToProfile(profile) : null;
  }

  async updateByCompanyId(companyId: string, data: Prisma.CompanyProfileUpdateInput): Promise<CompanyProfile> {
    const profile = await this.prisma.companyProfile.update({
      where: { company_id: companyId },
      data,
    });

    return this.mapPrismaToProfile(profile);
  }

  async getOrCreate(companyId: string): Promise<CompanyProfile> {
    const existing = await this.findByCompanyId(companyId);
    if (existing) {
      return existing;
    }
    return this.create(companyId);
  }

  private mapPrismaToProfile(profile: any): CompanyProfile {
    return {
      id: profile.id,
      companyId: profile.company_id,
      status: profile.status,
      completionPercentage: profile.completion_percentage,
      completedSections: profile.completed_sections || [],
      profileData: (profile.profile_data as CompanyProfileData | undefined) || undefined,
      lastReminderAt: profile.last_reminder_at || undefined,
      skipUntil: profile.skip_until || undefined,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }
}

export const companyProfileRepository = new CompanyProfileRepository();
