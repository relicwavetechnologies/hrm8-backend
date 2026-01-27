import { EmailStatus } from '@prisma/client';

export interface SendEmailRequest {
    to: string;
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    candidateId: string;
    jobId: string;
    applicationId?: string;
    templateId?: string;
    jobRoundId?: string;
}

export interface EmailFilter {
    senderId?: string; // For sent items
    candidateId?: string; // For inbox (if candidate is checking)
    status?: EmailStatus;
    jobId?: string;
}
