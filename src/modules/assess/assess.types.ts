export interface AssessRegistrationRequest {
    firstName: string;
    lastName: string;
    email: string;
    companyName: string;
    companyWebsite: string;
    country: string;
    acceptTerms: boolean;
    industry?: string;
    companySize?: string;
    billingEmail?: string;
}

export interface AssessLoginRequest {
    email: string;
    password?: string;
}

export interface CreateInternalJobRequest {
    title: string;
    department?: string;
    location?: string;
    category?: string;
    employmentType: 'full-time' | 'part-time' | 'contract' | 'casual';
    workArrangement?: 'on-site' | 'remote' | 'hybrid';
    vacancies?: number;
    requirements?: string[];
    responsibilities?: string[];
    description?: string;
}

export interface AddCandidateRequest {
    firstName: string;
    lastName: string;
    email: string;
    mobile?: string;
    mobileCountryCode?: string;
}

export interface MoveCandidateRequest {
    stage: string;
    roundId?: string;
}
