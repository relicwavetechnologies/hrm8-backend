export interface SearchTalentRequest {
    query?: string;
    skills?: string[];
    location?: string;
    experienceMin?: number;
    experienceMax?: number;
    companyId?: string; // Optional: restrict to company's candidates if applicable? Usually searches global or filtered
    // For this app, candidates seem global but application-specific data is private.
    // Assuming "Talent Pool" searches the global candidate base or candidates who applied?
    // Let's assume global search for now or restricted by visibility settings.
    page?: number;
    limit?: number;
}

export interface InviteCandidateRequest {
    jobId: string;
    candidateId?: string;
    email: string;
    message?: string;
    name?: string;
}

export interface CandidateSearchResponse {
    candidates: any[];
    total: number;
    page: number;
    totalPages: number;
}

export interface CandidateResponse {
    id: string;
    firstName: string;
    lastName: string;
    email: string; // Maybe hide if strict privacy? Usually recruiters see it.
    phone?: string;
    city?: string;
    state?: string;
    country?: string;
    photo?: string;
    title?: string; // Derived from last experience?
    skills: string[];
    experience: any[]; // Map from CandidateWorkExperience
    education: any[]; // Map from CandidateEducation
    resumeUrl?: string; // Default resume
    createdAt: Date;
    updatedAt: Date;
}
