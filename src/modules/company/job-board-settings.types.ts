import { JobAssignmentMode, RegionOwnerType, CommissionStatus } from '@prisma/client';

export interface UpdateJobBoardSettingsRequest {
    jobAssignmentMode?: JobAssignmentMode;
    privacySettings?: {
        attributionLocked?: boolean;
        publicProfileVisible?: boolean;
    };
    preferredRecruiterId?: string;
    salesAgentId?: string;
}

export interface JobBoardSettingsResponse {
    companyId: string;
    jobAssignmentMode: JobAssignmentMode;
    regionOwnerType: RegionOwnerType;
    commissionStatus: CommissionStatus;
    preferredRecruiterId?: string | null;
    salesAgentId?: string | null;
    privacySettings: {
        attributionLocked: boolean;
        attributionLockedAt?: Date | null;
    };
}
