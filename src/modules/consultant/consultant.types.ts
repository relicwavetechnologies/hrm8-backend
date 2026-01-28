import { Consultant, ConsultantJobAssignment, ConsultantSession } from '@prisma/client';

export interface ConsultantLoginRequest {
    email: string;
    password: string;
}

export interface ConsultantLoginResponse {
    consultant: Omit<Consultant, 'password_hash'>;
    sessionId: string;
}

export interface SetupAccountRequest {
    token: string;
    password: string;
    firstName: string;
    lastName: string;
}

export interface PipelineUpdateData {
    stage?: string; // Using string as PipelineStage enum might be complex to import depending on setup
    note?: string;
    progress?: number;
}

export interface ConsultantJobFilters {
    status?: string;
    page?: number;
    limit?: number;
}

export interface FlagJobRequest {
    issueType: string;
    description: string;
    severity: string;
}

export interface LogActivityRequest {
    activityType: string;
    notes: string;
}

export interface SubmitShortlistRequest {
    candidateIds: string[];
    notes?: string;
}

// Candidates for Consultant
export interface CandidateStatusUpdate {
    status: string;
    notes?: string;
}

export interface CandidateMoveRound {
    jobRoundId: string;
    notes?: string;
}

export interface SendMessageRequest {
    content: string;
    type?: 'TEXT' | 'FILE';
    attachments?: any[];
}

export interface WithdrawalRequest {
    amount: number;
    paymentMethod: string;
    description?: string;
    commissionIds?: string[];
}

export interface StripeOnboardResponse {
    url: string;
}
