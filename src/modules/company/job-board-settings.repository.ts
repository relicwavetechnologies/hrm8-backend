import { BaseRepository } from '../../core/repository';
import { JobBoardSettingsResponse } from './job-board-settings.types';
import { Prisma } from '@prisma/client';

export class JobBoardSettingsRepository extends BaseRepository {
    async getSettings(companyId: string): Promise<JobBoardSettingsResponse | null> {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                job_assignment_mode: true,
                region_owner_type: true,
                commission_status: true,
                preferred_recruiter_id: true,
                sales_agent_id: true,
                attribution_locked: true,
                attribution_locked_at: true
            }
        });

        if (!company) return null;

        return {
            companyId: company.id,
            jobAssignmentMode: company.job_assignment_mode,
            regionOwnerType: company.region_owner_type,
            commissionStatus: company.commission_status,
            preferredRecruiterId: company.preferred_recruiter_id,
            salesAgentId: company.sales_agent_id,
            privacySettings: {
                attributionLocked: company.attribution_locked,
                attributionLockedAt: company.attribution_locked_at
            }
        };
    }

    async updateSettings(companyId: string, data: Prisma.CompanyUpdateInput | Prisma.CompanyUncheckedUpdateInput): Promise<JobBoardSettingsResponse | null> {
        const updated = await this.prisma.company.update({
            where: { id: companyId },
            data,
            select: {
                id: true,
                job_assignment_mode: true,
                region_owner_type: true,
                commission_status: true,
                preferred_recruiter_id: true,
                sales_agent_id: true,
                attribution_locked: true,
                attribution_locked_at: true
            }
        });

        return {
            companyId: updated.id,
            jobAssignmentMode: updated.job_assignment_mode,
            regionOwnerType: updated.region_owner_type,
            commissionStatus: updated.commission_status,
            preferredRecruiterId: updated.preferred_recruiter_id,
            salesAgentId: updated.sales_agent_id,
            privacySettings: {
                attributionLocked: updated.attribution_locked,
                attributionLockedAt: updated.attribution_locked_at
            }
        };
    }
}
