import {
    InterviewStatus,
    VideoInterviewType,
    VideoInterview,
    InterviewFeedback,
} from '../../types';

export interface CreateInterviewRequest {
    applicationId: string;
    candidateId: string;
    jobId: string;
    scheduledDate: string | Date; // API might receive string
    duration?: number;
    interviewerIds: string[];
    type?: VideoInterviewType;
    meetingLink?: string;
    notes?: string;
}

export interface UpdateInterviewRequest {
    scheduledDate?: string | Date;
    duration?: number;
    interviewerIds?: string[];
    notes?: string;
    status?: InterviewStatus;
    meetingLink?: string;
    cancellationReason?: string;
}

export interface SubmitFeedbackRequest {
    overallRating?: number;
    recommendation?: any; // strict type if available
    strengths?: string;
    concerns?: string;
    notes?: string;
    ratingCriteriaScores?: any;
}

export interface VideoInterviewResponse extends VideoInterview {
    interviewFeedback?: InterviewFeedback[];
}

export interface AutoScheduleRequest {
    jobId: string;
    candidates: string[];
    dateRange: { start: string | Date; end: string | Date };
    duration: number;
    timeZone: string;
}

export interface Suggestion {
    candidateId: string;
    suggestedSlots: string[];
    score: number;
}

export interface AutoScheduleResponse {
    suggestions: Suggestion[];
}

export interface FinalizeInterviewRequest {
    interviewIds: string[];
    confirmNotifications: boolean;
}

export interface SendInvitationRequest {
    method: 'email' | 'sms' | 'both';
}

export interface ProgressionStatusResponse {
    interviewId: string;
    currentStage: string;
    completedStages: string[];
    nextStage?: string;
    isBlocked: boolean;
    blockReason?: string;
}

export interface CalendarEventResponse {
    id: string;
    title: string;
    start: Date;
    end: Date;
    interviewId: string;
    candidateName: string;
    interviewerNames: string[];
    status: InterviewStatus;
}
