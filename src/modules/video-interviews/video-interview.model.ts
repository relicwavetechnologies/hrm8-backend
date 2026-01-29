import { VideoInterview, InterviewFeedback } from '@prisma/client';

export interface VideoInterviewData extends VideoInterview {
  application?: {
    id: string;
    job_id: string;
    candidate_id: string;
    status: string;
  };
  interview_feedback?: InterviewFeedback[];
}

export interface VideoInterviewDetails extends VideoInterviewData {
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  job?: {
    id: string;
    title: string;
    companyId: string;
  };
}
