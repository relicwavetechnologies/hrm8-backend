export enum JobRoundType {
    SCREENING = 'SCREENING',
    ASSESSMENT = 'ASSESSMENT',
    INTERVIEW = 'INTERVIEW',
    OFFER = 'OFFER',
    HIRED = 'HIRED',
    OTHER = 'OTHER'
}

export interface JobRound {
    id: string;
    job_id: string;
    name: string;
    order: number;
    type: JobRoundType;
    is_fixed: boolean; // mapped from isFixed in Prisma
    fixed_key?: string | null; // mapped from fixedKey in Prisma
    created_at: Date;
    updated_at: Date;
}

export interface CreateJobRoundRequest {
    jobId: string;
    name: string;
    type: JobRoundType;
    order?: number;
}

export interface UpdateJobRoundRequest {
    name?: string;
    type?: JobRoundType;
    order?: number;
}
