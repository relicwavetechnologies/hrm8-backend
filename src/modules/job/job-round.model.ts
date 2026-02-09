import { JobRoundType } from '@prisma/client';

export interface CreateJobRoundRequest {
    name: string;
    type: JobRoundType;
    assessmentConfig?: any;
    /** When set (Simple Flow), members with this job role are auto-assigned as round interviewers */
    assignedRoleId?: string;
}

export interface UpdateJobRoundRequest {
    name?: string;
    type?: JobRoundType;
    order?: number;
    /** When set (Simple Flow), members with this job role are auto-assigned as round interviewers */
    assignedRoleId?: string;
}
