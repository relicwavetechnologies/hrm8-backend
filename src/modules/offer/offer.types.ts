import { OfferStatus } from '../../types';

export interface CreateOfferRequest {
    applicationId: string;
    candidateId: string;
    jobId: string;
    salary: number;
    salaryCurrency?: string;
    salaryPeriod: string; // MONTHLY, YEARLY
    startDate: string | Date; // Date is often string in JSON
    benefits?: string[];
    expirationDate?: string | Date;
    offerType: string; // FULL_TIME, PART_TIME
    workLocation: string;
    workArrangement: string; // REMOTE, ONSITE, HYBRID
    customTerms?: any;
}

export interface UpdateOfferRequest {
    salary?: number;
    salaryCurrency?: string;
    salaryPeriod?: string;
    startDate?: string | Date;
    benefits?: string[];
    expirationDate?: string | Date;
    offerType?: string;
    workLocation?: string;
    workArrangement?: string;
    status?: OfferStatus;
    customTerms?: any;
}

export interface SendOfferRequest {
    customMessage?: string;
}

export enum NegotiationMessageType {
    CANDIDATE_PROPOSAL = 'CANDIDATE_PROPOSAL',
    COMPANY_COUNTER = 'COMPANY_COUNTER',
    CLARIFICATION = 'CLARIFICATION'
}

export interface NegotiationRequest {
    messageType: NegotiationMessageType;
    message: string;
    proposedChanges?: any; // JSON with suggested salary/terms
}

export enum DocumentCategory {
    ID_PROOF = 'ID_PROOF',
    EDUCATION_CERT = 'EDUCATION_CERT',
    TAX_FORM = 'TAX_FORM',
    OTHER = 'OTHER'
}

// Re-export from Prisma to avoid conflicts
import { DocumentStatus } from '@prisma/client';
export { DocumentStatus };

export interface DocumentRequest {
    name: string;
    description?: string;
    category: DocumentCategory;
    isRequired?: boolean;
    templateUrl?: string;
}

export interface WithdrawOfferRequest {
    reason: string;
}

export interface ReviewDocumentRequest {
    status: DocumentStatus; // APPROVED or REJECTED
    notes?: string;
}

