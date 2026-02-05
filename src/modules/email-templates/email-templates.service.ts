import { BaseService } from '../../core/service';
import { EmailTemplateRepository } from './email-templates.repository';
import { HttpException } from '../../core/http-exception';
import {
    CreateEmailTemplateRequest,
    UpdateEmailTemplateRequest,
    GenerateAITemplateRequest,
    EnhanceAITemplateRequest
} from './email-templates.types';
import { AuthenticatedRequest } from '../../types';
import { EmailTemplateType } from '@prisma/client';
import { EmailTemplateAIService } from '../ai/email-template-ai.service';

export class EmailTemplateService extends BaseService {
    constructor(private repository: EmailTemplateRepository) {
        super();
    }

    /**
     * Create a new email template
     */
    async createTemplate(data: CreateEmailTemplateRequest, user: AuthenticatedRequest['user']) {
        if (!user) throw new HttpException(401, 'Unauthorized');

        return this.repository.create({
            name: data.name,
            subject: data.subject,
            body: data.body,
            type: data.type || EmailTemplateType.CUSTOM,
            variables: data.variables || [],
            is_active: data.isActive !== undefined ? data.isActive : true,
            is_default: data.isDefault || false,
            company: { connect: { id: user.companyId as string } },
            user: { connect: { id: user.id } },
        });
    }

    /**
     * Get all templates for a company
     */
    async getCompanyTemplates(companyId: string) {
        return this.repository.findAllByCompany(companyId);
    }

    /**
     * Get a specific template
     */
    async getTemplate(id: string, companyId: string) {
        const template = await this.repository.findByIdAndCompany(id, companyId);
        if (!template) {
            throw new HttpException(404, 'Template not found');
        }
        return template;
    }

    /**
     * Update a template
     */
    async updateTemplate(id: string, data: UpdateEmailTemplateRequest, user: AuthenticatedRequest['user']) {
        if (!user) throw new HttpException(401, 'Unauthorized');

        // Verify ownership
        await this.getTemplate(id, user.companyId as string);

        return this.repository.update(id, {
            name: data.name,
            subject: data.subject,
            body: data.body,
            type: data.type,
            variables: data.variables,
            is_active: data.isActive,
            is_default: data.isDefault,
        });
    }

    /**
     * Delete a template
     */
    async deleteTemplate(id: string, companyId: string) {
        await this.getTemplate(id, companyId);
        return this.repository.delete(id);
    }

    /**
     * Generate AI template
     */
    async generateAITemplate(request: GenerateAITemplateRequest) {
        return EmailTemplateAIService.generateTemplate({
            type: request.templateType || (request.category as any) || 'CUSTOM',
            jobTitle: request.jobId || 'Unknown Position', // Ideally fetch from job repository
            companyName: request.companyId || 'Unknown Company', // Ideally fetch from company repository
            candidateName: 'Candidate', // Placeholder
            context: request.prompt + (request.tone ? `. Tone: ${request.tone}` : '')
        });
    }

    /**
     * Enhance existing template using AI
     */
    async enhanceTemplate(request: EnhanceAITemplateRequest) {
        return EmailTemplateAIService.enhanceTemplate(request.body, request.instructions);
    }

    /**
     * Get available variables
     */
    getVariables() {
        return [
            { name: '{{candidate_name}}', description: 'Name of the candidate' },
            { name: '{{job_title}}', description: 'Title of the job' },
            { name: '{{company_name}}', description: 'Name of the company' },
            { name: '{{sender_name}}', description: 'Name of the sender' },
            { name: '{{interview_date}}', description: 'Date of the interview' },
            { name: '{{interview_link}}', description: 'Link to the interview' },
        ];
    }

    /**
     * Preview template by replacing variables
     */
    async previewTemplate(id: string, companyId: string, data?: Record<string, string>) {
        const template = await this.getTemplate(id, companyId);
        let body = template.body;
        let subject = template.subject;

        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                const regex = new RegExp(key, 'g');
                body = body.replace(regex, value);
                subject = subject.replace(regex, value);
            });
        }

        return { ...template, body, subject };
    }
}
