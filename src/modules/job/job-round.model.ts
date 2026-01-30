import { JobRoundType } from '@prisma/client';

export interface CreateJobRoundRequest {
    name: string;
    type: JobRoundType;
    assessmentConfig?: any;
}

export interface UpdateJobRoundRequest {
    name?: string;
    type?: JobRoundType;
    order?: number;
}
