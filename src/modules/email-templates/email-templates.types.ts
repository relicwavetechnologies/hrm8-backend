import { EmailTemplateType } from '@prisma/client';

export interface CreateEmailTemplateRequest {
    name: string;
    type?: EmailTemplateType;
    subject: string;
    body: string;
    variables?: string[];
    isActive?: boolean;
    isDefault?: boolean;
}

export interface UpdateEmailTemplateRequest extends Partial<CreateEmailTemplateRequest> { }

export interface GenerateAITemplateRequest {
    prompt: string;
    category?: string;
    tone?: 'professional' | 'friendly' | 'casual' | 'formal' | string;
    jobId?: string;
    companyId?: string;
    templateType?: EmailTemplateType;
}

export interface EnhanceAITemplateRequest {
    body: string;
    instructions: string;
}

export interface PreviewTemplateRequest {
    templateId: string;
    data?: Record<string, string>;
}
