import { EmailTemplateType } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';

export class EmailTemplateService {
    private mapToDTO(template: any) {
        return {
            id: template.id,
            company_id: template.company_id,
            job_id: template.job_id,
            job_round_id: template.job_round_id,
            name: template.name,
            type: template.type,
            subject: template.subject,
            body: template.body,
            variables: template.variables || [],
            is_active: template.is_active,
            is_default: template.is_default,
            is_ai_generated: template.is_ai_generated,
            version: template.version,
            created_by: template.created_by,
            created_at: template.created_at,
            updated_at: template.updated_at,
        };
    }

    async getAll(filters: {
        companyId?: string;
        jobId?: string;
        jobRoundId?: string;
        type?: EmailTemplateType;
        regionIds?: string[];
    }) {
        const where: any = {};
        if (filters.companyId) where.company_id = filters.companyId;
        if (filters.jobId) where.job_id = filters.jobId;
        if (filters.jobRoundId) where.job_round_id = filters.jobRoundId;
        if (filters.type) where.type = filters.type;
        if (filters.regionIds && filters.regionIds.length > 0) {
            where.company = { region_id: { in: filters.regionIds } };
        }

        const templates = await prisma.emailTemplate.findMany({
            where,
            orderBy: { updated_at: 'desc' },
        });
        return templates.map((t) => this.mapToDTO(t));
    }

    async create(data: {
        company_id: string;
        job_id?: string | null;
        job_round_id?: string | null;
        name: string;
        type: EmailTemplateType;
        subject: string;
        body: string;
        variables?: string[];
        is_active?: boolean;
        is_default?: boolean;
        is_ai_generated?: boolean;
        created_by?: string;
    }) {
        const createdBy =
            data.created_by ||
            (await prisma.user.findFirst({
                where: { company_id: data.company_id },
                orderBy: { created_at: 'asc' },
                select: { id: true },
            }))?.id;

        if (!createdBy) {
            throw new HttpException(400, 'Company has no users to assign created_by');
        }

        if (data.is_default) {
            await prisma.emailTemplate.updateMany({
                where: { company_id: data.company_id, type: data.type },
                data: { is_default: false },
            });
        }

        const template = await prisma.emailTemplate.create({
            data: {
                company_id: data.company_id,
                job_id: data.job_id || null,
                job_round_id: data.job_round_id || null,
                name: data.name,
                type: data.type,
                subject: data.subject,
                body: data.body,
                variables: data.variables || [],
                is_active: data.is_active ?? true,
                is_default: data.is_default ?? false,
                is_ai_generated: data.is_ai_generated ?? false,
                created_by: createdBy,
            },
        });

        return this.mapToDTO(template);
    }

    async update(id: string, data: any) {
        if (data.is_default) {
            const existing = await prisma.emailTemplate.findUnique({ where: { id } });
            if (!existing) throw new HttpException(404, 'Template not found');
            await prisma.emailTemplate.updateMany({
                where: { company_id: existing.company_id, type: existing.type },
                data: { is_default: false },
            });
        }

        const template = await prisma.emailTemplate.update({
            where: { id },
            data: {
                name: data.name,
                subject: data.subject,
                body: data.body,
                variables: data.variables,
                is_active: data.is_active,
                is_default: data.is_default,
                is_ai_generated: data.is_ai_generated,
            },
        });
        return this.mapToDTO(template);
    }

    async delete(id: string) {
        await prisma.emailTemplate.delete({ where: { id } });
        return true;
    }

    getVariables() {
        return [
            { key: 'candidateName', label: 'Candidate Name', description: 'Full name of the candidate', example: 'John Doe', category: 'Candidate' },
            { key: 'candidateFirstName', label: 'First Name', description: 'First name only', example: 'John', category: 'Candidate' },
            { key: 'candidateLastName', label: 'Last Name', description: 'Last name only', example: 'Doe', category: 'Candidate' },
            { key: 'candidateEmail', label: 'Email', description: 'Candidate email address', example: 'john@example.com', category: 'Candidate' },
            { key: 'candidatePhone', label: 'Phone', description: 'Candidate phone number', example: '+1 555-0123', category: 'Candidate' },
            { key: 'applicationDate', label: 'Application Date', description: 'When they applied', example: 'January 1, 2025', category: 'Application' },
            { key: 'currentStage', label: 'Current Stage', description: 'Current pipeline stage', example: 'Technical Interview', category: 'Application' },
            { key: 'applicationStatus', label: 'Application Status', description: 'Status label', example: 'SCREENING', category: 'Application' },
            { key: 'jobTitle', label: 'Job Title', description: 'Title of the job position', example: 'Senior Developer', category: 'Job' },
            { key: 'companyName', label: 'Company Name', description: 'Name of the hiring company', example: 'Acme Corp', category: 'Company' },
            { key: 'jobLocation', label: 'Job Location', description: 'Location of the role', example: 'San Francisco, CA', category: 'Job' },
            { key: 'jobDepartment', label: 'Job Department', description: 'Department name', example: 'Engineering', category: 'Job' },
            { key: 'recruiterName', label: 'Recruiter Name', description: 'Name of the recruiter', example: 'Jane Smith', category: 'User' },
            { key: 'recruiterEmail', label: 'Recruiter Email', description: 'Recruiter email', example: 'jane.smith@acme.com', category: 'User' },
            { key: 'roundName', label: 'Round Name', description: 'Interview round name', example: 'Technical Interview', category: 'Interview' },
            { key: 'roundType', label: 'Round Type', description: 'Interview round type', example: 'INTERVIEW', category: 'Interview' },
        ];
    }

    async preview(id: string, data: any) {
        const template = await prisma.emailTemplate.findUnique({ where: { id } });
        if (!template) throw new HttpException(404, 'Template not found');

        const sampleVariables = data?.sample_data || {
            candidateName: 'John Doe',
            candidateFirstName: 'John',
            candidateLastName: 'Doe',
            candidateEmail: 'john.doe@example.com',
            candidatePhone: '+1 555-0123',
            jobTitle: 'Senior Software Engineer',
            companyName: 'Acme Corporation',
            jobLocation: 'San Francisco, CA',
            jobDepartment: 'Engineering',
            applicationDate: new Date().toLocaleDateString(),
            currentStage: 'Phone Screen',
            applicationStatus: 'SCREENING',
            recruiterName: 'Jane Smith',
            recruiterEmail: 'jane.smith@acme.com',
            roundName: 'Technical Interview',
            roundType: 'INTERVIEW',
        };

        const render = (text: string) => {
            return text.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
                return sampleVariables[key] ?? '';
            });
        };

        return {
            subject: render(template.subject),
            body: render(template.body),
        };
    }
}
