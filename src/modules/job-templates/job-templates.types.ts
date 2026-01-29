import { TemplateCategory } from '@prisma/client';

export interface JobTemplate {
    id: string;
    companyId: string;
    createdBy: string;
    name: string;
    description?: string | null;
    category: TemplateCategory;
    isShared: boolean;
    sourceJobId?: string | null;
    jobData: any;
    usageCount: number;
    lastUsedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateJobTemplateRequest {
    name: string;
    description?: string;
    category?: TemplateCategory;
    isShared?: boolean;
    sourceJobId?: string;
    jobData: any;
}

export interface UpdateJobTemplateRequest {
    name?: string;
    description?: string;
    category?: TemplateCategory;
    isShared?: boolean;
    jobData?: any;
}
