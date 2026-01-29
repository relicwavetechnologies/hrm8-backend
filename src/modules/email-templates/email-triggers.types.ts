import { TriggerType } from '@prisma/client';

export interface CreateTriggerRequest {
    templateId: string;
    jobRoundId: string;
    triggerType: TriggerType;
    triggerCondition?: any;
    delayDays?: number;
    delayHours?: number;
    scheduledTime?: string;
    isActive?: boolean;
}

export interface UpdateTriggerRequest {
    templateId?: string;
    jobRoundId?: string;
    triggerType?: TriggerType;
    triggerCondition?: any;
    delayDays?: number;
    delayHours?: number;
    scheduledTime?: string;
    isActive?: boolean;
}

export interface TestTriggerRequest {
    jobId: string;
    candidateId: string; // To test with real data context
}
