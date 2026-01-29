import { BaseRepository } from '../../core/repository';
import { Prisma, CompanySettings } from '@prisma/client';
import { UpdateCompanySettingsRequest } from './company-settings.types';

export class CompanySettingsRepository extends BaseRepository {
    /**
     * Find settings by company ID
     */
    async findSettings(companyId: string): Promise<CompanySettings | null> {
        return this.prisma.companySettings.findUnique({
            where: { company_id: companyId },
        });
    }

    /**
     * Upsert settings (create if not exists, update if distinct)
     */
    async upsertSettings(companyId: string, data: UpdateCompanySettingsRequest): Promise<CompanySettings> {
        const input: Prisma.CompanySettingsCreateInput = {
            company: { connect: { id: companyId } },
            timezone: data.timezone,
            work_days: data.workDays,
            start_time: data.startTime,
            end_time: data.endTime,
            lunch_start: data.lunchStart,
            lunch_end: data.lunchEnd,
        };

        const update: Prisma.CompanySettingsUpdateInput = {
            timezone: data.timezone,
            work_days: data.workDays,
            start_time: data.startTime,
            end_time: data.endTime,
            lunch_start: data.lunchStart,
            lunch_end: data.lunchEnd,
        };

        return this.prisma.companySettings.upsert({
            where: { company_id: companyId },
            create: input,
            update: update,
        });
    }
}
