import { BaseService } from '../../core/service';
import { CompanySettingsRepository } from './company-settings.repository';
import { CompanySettingsResponse, UpdateCompanySettingsRequest } from './company-settings.types';
import { HttpException } from '../../core/http-exception';

export class CompanySettingsService extends BaseService {
    constructor(private readonly repository: CompanySettingsRepository) {
        super();
    }

    /**
     * Get company settings
     */
    async getSettings(companyId: string): Promise<CompanySettingsResponse> {
        let settings = await this.repository.findSettings(companyId);

        if (!settings) {
            // Create defaults if not exists
            settings = await this.repository.upsertSettings(companyId, {});
        }

        return this.mapToResponse(settings);
    }

    /**
     * Update company settings
     */
    async updateSettings(companyId: string, data: UpdateCompanySettingsRequest): Promise<CompanySettingsResponse> {
        const settings = await this.repository.upsertSettings(companyId, data);
        return this.mapToResponse(settings);
    }

    private mapToResponse(settings: any): CompanySettingsResponse {
        return {
            id: settings.id,
            companyId: settings.company_id,
            timezone: settings.timezone,
            workDays: settings.work_days,
            startTime: settings.start_time,
            endTime: settings.end_time,
            lunchStart: settings.lunch_start,
            lunchEnd: settings.lunch_end,
            createdAt: settings.created_at,
            updatedAt: settings.updated_at,
        };
    }
}
