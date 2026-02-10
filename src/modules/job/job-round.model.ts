import { JobRoundType } from '@prisma/client';

export interface CreateJobRoundRequest {
    name: string;
    type: JobRoundType;
    assessmentConfig?: any;
    /** When set (Simple Flow), members with this job role are auto-assigned as round interviewers */
    assignedRoleId?: string;
    /** When true, all hiring team roles can move/manage in this round; default true */
    syncPermissions?: boolean;
    /** When true, enables auto-move on pass in Interview/Assessment config (Advanced) */
    autoMoveOnPass?: boolean;
}

export interface UpdateJobRoundRequest {
    name?: string;
    type?: JobRoundType;
    order?: number;
    /** When set (Simple Flow), members with this job role are auto-assigned as round interviewers */
    assignedRoleId?: string;
    syncPermissions?: boolean;
    autoMoveOnPass?: boolean;
    /** For INTERVIEW rounds: require approval from all assigned interviewers before progression */
    requireAllInterviewers?: boolean;
}
