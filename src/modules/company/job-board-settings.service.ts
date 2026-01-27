import { BaseService } from '../../core/service';
import { JobBoardSettingsRepository } from './job-board-settings.repository';
import { UpdateJobBoardSettingsRequest, JobBoardSettingsResponse } from './job-board-settings.types';
import { Prisma } from '@prisma/client';

export class JobBoardSettingsService extends BaseService {
    private repo: JobBoardSettingsRepository;

    constructor() {
        super();
        this.repo = new JobBoardSettingsRepository();
    }

    async getSettings(companyId: string): Promise<JobBoardSettingsResponse> {
        const settings = await this.repo.getSettings(companyId);
        if (!settings) {
            throw new Error('Company not found');
        }
        return settings;
    }

    async updateSettings(companyId: string, data: UpdateJobBoardSettingsRequest): Promise<JobBoardSettingsResponse> {
        const updateData: Prisma.CompanyUncheckedUpdateInput = {};

        if (data.jobAssignmentMode) {
            updateData.job_assignment_mode = data.jobAssignmentMode;
        }

        if (data.preferredRecruiterId !== undefined) {
            updateData.preferred_recruiter_id = data.preferredRecruiterId;
        }

        if (data.salesAgentId !== undefined) {
            updateData.sales_agent_id = data.salesAgentId;
        }

        if (data.privacySettings) {
            if (data.privacySettings.attributionLocked !== undefined) {
                updateData.attribution_locked = data.privacySettings.attributionLocked;
                // If locking, set timestamp
                if (data.privacySettings.attributionLocked) {
                    updateData.attribution_locked_at = new Date();
                }
            }
        }

        const updated = await this.repo.updateSettings(companyId, updateData);
        if (!updated) {
            throw new Error('Failed to update settings');
        }
        return updated;
    }
}
