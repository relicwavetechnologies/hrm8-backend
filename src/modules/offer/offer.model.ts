import { OfferStatus, DocumentStatus } from '@prisma/client';

export interface OfferData {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  userId: string;
  status: OfferStatus;
  salary: number;
  salaryCurrency: string;
  salaryPeriod: string;
  startDate: Date;
  benefits: string[];
  bonusStructure?: string;
  equityOptions?: string;
  workLocation: string;
  workArrangement: string;
  probationPeriod?: number;
  vacationDays?: number;
  customTerms?: any;
  expiryDate?: Date;
  sentDate?: Date;
  respondedDate?: Date;
  signedDocumentUrl?: string;
  generatedPdfUrl?: string;
  customMessage?: string;
  declineReason?: string;
  createdAt: Date;
  updatedAt: Date;
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
  application?: {
    id: string;
    status: string;
  };
}

export interface DocumentData {
  id: string;
  offerId: string;
  name: string;
  description?: string;
  category: string;
  isRequired: boolean;
  templateUrl?: string;
  fileUrl?: string;
  fileName?: string;
  status: DocumentStatus;
  uploadedDate?: Date;
  uploadedBy?: string;
  reviewedDate?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NegotiationData {
  id: string;
  offerId: string;
  messageType: string;
  message: string;
  proposedChanges?: any;
  senderId: string;
  senderType: 'candidate' | 'employer';
  senderName: string;
  senderEmail?: string;
  responded?: boolean;
  response?: string;
  responseDate?: Date;
  createdAt: Date;
}

export interface CreateOfferRequest {
  applicationId: string;
  offerType: string;
  salary: number;
  salaryCurrency?: string;
  salaryPeriod: string;
  startDate: Date;
  benefits?: string[];
  bonusStructure?: string;
  equityOptions?: string;
  workLocation: string;
  workArrangement: string;
  probationPeriod?: number;
  vacationDays?: number;
  customTerms?: any;
  expiryDate?: Date;
  customMessage?: string;
}

export interface UpdateOfferRequest {
  salary?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  startDate?: Date;
  benefits?: string[];
  bonusStructure?: string;
  equityOptions?: string;
  workLocation?: string;
  workArrangement?: string;
  probationPeriod?: number;
  vacationDays?: number;
  customTerms?: any;
  expiryDate?: Date;
  customMessage?: string;
}

export interface CreateDocumentRequest {
  offerId: string;
  name: string;
  description?: string;
  category: string;
  isRequired?: boolean;
  templateUrl?: string;
  expiryDate?: Date;
}

export interface UploadDocumentRequest {
  offerId: string;
  documentId: string;
  fileUrl: string;
  fileName: string;
}

export interface ReviewDocumentRequest {
  documentId: string;
  status: DocumentStatus;
  notes?: string;
}

export interface InitiateNegotiationRequest {
  offerId: string;
  message: string;
  proposedChanges?: {
    salary?: number;
    startDate?: Date;
    benefits?: string[];
    vacationDays?: number;
    workArrangement?: string;
    [key: string]: any;
  };
}

export interface RespondToNegotiationRequest {
  negotiationId: string;
  message: string;
  response: 'accept' | 'reject' | 'counter';
  counterChanges?: {
    salary?: number;
    startDate?: Date;
    benefits?: string[];
    vacationDays?: number;
    workArrangement?: string;
    [key: string]: any;
  };
}
