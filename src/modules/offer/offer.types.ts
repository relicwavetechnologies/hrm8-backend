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
