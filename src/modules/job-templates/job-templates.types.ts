import { TemplateCategory } from '@prisma/client';

export interface CreateJobTemplateRequest {
    name: string;
    description?: string;
    category?: TemplateCategory;
    isShared?: boolean;
    jobData: any; // Using any for flexible JSON structure as per schema
}

export interface UpdateJobTemplateRequest extends Partial<CreateJobTemplateRequest> { }

export { TemplateCategory };
