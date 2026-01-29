export interface ResumeAnnotation {
    id: string;
    resume_id: string;
    user_id: string;
    user_name: string;
    user_color: string;
    type: string;
    text: string;
    comment?: string | null;
    position: any; // Using any for JSON type as per Prisma compatibility
    created_at: Date;
}

export interface CreateAnnotationRequest {
    type: string;
    text: string;
    comment?: string;
    position: any;
    userColor?: string;
}
