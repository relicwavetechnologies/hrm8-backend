export interface CreateCandidateWorkExperienceDTO {
    company: string;
    role: string;
    startDate: string | Date;
    endDate?: string | Date;
    current?: boolean;
    description?: string;
    location?: string;
}

export interface CreateCandidateEducationDTO {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string | Date;
    endDate?: string | Date;
    current?: boolean;
    grade?: string;
    description?: string;
}

export interface CreateCandidateCertificationDTO {
    name: string;
    issuingOrganization: string;
    issueDate: string | Date;
    expiryDate?: string | Date;
    credentialId?: string;
    credentialUrl?: string;
}

export interface CreateCandidateTrainingDTO {
    name: string;
    provider: string;
    completionDate: string | Date;
    description?: string;
}

export interface CreateCandidatePortfolioDTO {
    title: string;
    description?: string;
    url?: string;
    type?: string;
}

export interface UpdateCandidateProfileDTO {
    first_name?: string;
    last_name?: string;
    bio?: string;
    phone?: string;
    location?: string;
    headline?: string;
    website?: string;
    linkedin_url?: string;
    github_url?: string;
}

export interface UpdateCandidatePreferencesDTO {
    job_type_preference?: string[];
    salary_preference?: any;
    relocation_willing?: boolean;
    remote_preference?: string;
    visa_status?: string;
    work_eligibility?: string;
}

export interface CreateCandidateResumeDTO {
    file_name: string;
    file_url: string;
    file_size: number;
    file_type: string;
    is_default?: boolean;
    content?: string;
}

export interface UpdateCandidateResumeDTO {
    file_name?: string;
    is_default?: boolean;
}

export interface CreateCandidateCoverLetterDTO {
    title: string;
    content?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    is_template?: boolean;
    is_draft?: boolean;
}

export interface UpdateCandidateCoverLetterDTO {
    title?: string;
    content?: string;
    is_template?: boolean;
    is_draft?: boolean;
}

export interface UpdateNotificationPreferencesDTO {
    application_status_changes?: boolean;
    interview_reminders?: boolean;
    job_match_alerts?: boolean;
    messages?: boolean;
    system_updates?: boolean;
    email_enabled?: boolean;
    in_app_enabled?: boolean;
    reminder_hours_before?: number;
}
