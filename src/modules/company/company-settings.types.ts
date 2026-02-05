export interface UpdateCompanySettingsRequest {
    timezone?: string;
    workDays?: string[];
    startTime?: string;
    endTime?: string;
    lunchStart?: string;
    lunchEnd?: string;
}

export interface CompanySettingsResponse {
    id: string;
    companyId: string;
    timezone: string | null;
    workDays: string[];
    startTime: string | null;
    endTime: string | null;
    lunchStart: string | null;
    lunchEnd: string | null;
    createdAt: Date;
    updatedAt: Date;
}
