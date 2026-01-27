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
