import { ApplicationStatus, ApplicationStage } from '@prisma/client';

export interface CandidateEducation {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate?: Date;
  endDate?: Date;
  current: boolean;
  grade?: string;
  description?: string;
}

export interface CandidateSkill {
  id: string;
  name: string;
  level?: string;
}

export interface CandidateWorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description?: string;
  location?: string;
}

export interface ApplicationData {
  id: string;
  candidateId: string;
  jobId: string;
  status: ApplicationStatus;
  stage: ApplicationStage;
  appliedDate: Date;
  resumeUrl?: string;
  coverLetterUrl?: string;
  portfolioUrl?: string;
  linkedInUrl?: string;
  websiteUrl?: string;
  customAnswers?: Array<{
    questionId: string;
    answer: string | string[];
  }>;
  questionnaireData?: any;
  isRead: boolean;
  isNew: boolean;
  tags: string[];
  score?: number;
  rank?: number;
  aiAnalysis?: any;
  shortlisted: boolean;
  shortlistedAt?: Date;
  shortlistedBy?: string;
  manuallyAdded: boolean;
  addedBy?: string;
  addedAt?: Date;
  recruiterNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  roundId?: string;
}

export interface SubmitApplicationRequest {
  jobId: string;
  candidateId: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  portfolioUrl?: string;
  linkedInUrl?: string;
  websiteUrl?: string;
  customAnswers?: Array<{
    questionId: string;
    answer: string | string[];
  }>;
  questionnaireData?: any;
}

export interface ApplicationFilters {
  status?: ApplicationStatus;
  stage?: ApplicationStage;
  minScore?: number;
  maxScore?: number;
  shortlisted?: boolean;
}
