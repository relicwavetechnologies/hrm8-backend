import { Response } from 'express';
import { EmailTemplateService } from './email-template.service';
import { emailService } from './email.service';
import { AuthenticatedRequest } from '../../types';

function normalizeTemplateType(t: string | undefined): string {
    if (!t) return 'CUSTOM';
    const u = t.toUpperCase();
    if (u === 'REJECTED') return 'REJECTION';
    return u;
}

export class EmailTemplateController {
    private static getContext(req: any) {
        return {
            userId: (req.user?.id || req.hrm8User?.id) as string | undefined,
            companyId: (req.user?.companyId || req.query?.company_id || req.body?.company_id) as string | undefined,
        };
    }

    static async create(req: AuthenticatedRequest, res: Response) {
        try {
            const { userId, companyId } = EmailTemplateController.getContext(req);
            if (!companyId) {
                return res.status(400).json({ success: false, message: 'company_id is required' });
            }

            const template = await EmailTemplateService.create({
                ...req.body,
                type: normalizeTemplateType(req.body.type) || 'CUSTOM',
                company: { connect: { id: companyId } },
                user: userId ? { connect: { id: userId } } : undefined,
                jobId: req.body.jobId || undefined,
                jobRoundId: req.body.jobRoundId || undefined
            });
            res.json({ success: true, data: template });
        } catch (error) {
            console.error('Create Template Error:', error);
            res.status(500).json({ success: false, message: 'Failed to create template' });
        }
    }

    static async update(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params as { id: string };
            const updateData = { ...req.body };
            if (updateData.type) {
                updateData.type = normalizeTemplateType(updateData.type);
            }
            const template = await EmailTemplateService.update(id, updateData);
            res.json({ success: true, data: template });
        } catch (error) {
            console.error('Update Template Error:', error);
            res.status(500).json({ success: false, message: 'Failed to update template' });
        }
    }

    static async getOne(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params as { id: string };
            const template = await EmailTemplateService.findOne(id);
            if (!template) {
                return res.status(404).json({ success: false, message: 'Template not found' });
            }
            res.json({ success: true, data: template });
        } catch (error) {
            console.error('Get Template Error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch template' });
        }
    }

    static async getAll(req: AuthenticatedRequest, res: Response) {
        try {
            const { type, jobId, jobRoundId, company_id } = req.query;
            const { companyId } = EmailTemplateController.getContext(req);
            const filters: any = {
                company_id: companyId || company_id
            };

            if (type) {
                filters.type = normalizeTemplateType(type as string);
            }
            if (jobId) {
                filters.job_id = jobId as string;
            }
            if (jobRoundId) {
                filters.job_round_id = jobRoundId as string;
            }

            const templates = await EmailTemplateService.findAll(filters);
            res.json({ success: true, data: templates });
        } catch (error) {
            console.error('Get All Templates Error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch templates' });
        }
    }

    static async getVariables(_req: AuthenticatedRequest, res: Response) {
        try {
            const variables = [
                { key: 'candidateName', label: 'Candidate Name', description: 'Candidate full name', example: 'John Doe', category: 'candidate' },
                { key: 'jobTitle', label: 'Job Title', description: 'Target job title', example: 'Software Engineer', category: 'job' },
                { key: 'companyName', label: 'Company Name', description: 'Company name', example: 'Acme Inc', category: 'company' },
                { key: 'interviewType', label: 'Interview Type', description: 'Interview type', example: 'Technical', category: 'interview' },
                { key: 'scheduledDate', label: 'Scheduled Date', description: 'Interview date/time', example: '2026-02-10 10:00 AM', category: 'interview' },
                { key: 'meetingLink', label: 'Meeting Link', description: 'Meeting URL', example: 'https://meet.google.com/abc-defg-hij', category: 'interview' },
                { key: 'offerUrl', label: 'Offer URL', description: 'Offer URL', example: 'https://hrm8.com/offer/123', category: 'offer' },
                { key: 'verificationUrl', label: 'Verification URL', description: 'Verification URL', example: 'https://hrm8.com/verify/123', category: 'verification' },
                { key: 'assessmentUrl', label: 'Assessment URL', description: 'Assessment URL', example: 'https://hrm8.com/assessment/123', category: 'assessment' },
            ];
            res.json({ success: true, data: variables });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch variables' });
        }
    }

    static async preview(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params as { id: string };
            const template = await EmailTemplateService.findOne(id);
            if (!template) {
                return res.status(404).json({ success: false, message: 'Template not found' });
            }

            const vars = (req.body?.variables || {}) as Record<string, string>;
            const fill = (input: string) => input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => vars[key] ?? `{{${key}}}`);

            res.json({
                success: true,
                data: {
                    subject: fill(template.subject || ''),
                    body: fill(template.body || ''),
                },
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to preview template' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params as { id: string };
            await EmailTemplateService.remove(id);
            res.json({ success: true, message: 'Template deleted' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete template' });
        }
    }

    static async sendTest(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params as { id: string };
            const { to, variables } = req.body;

            if (!to) {
                return res.status(400).json({ success: false, message: 'Recipient email (to) is required' });
            }

            // Default variables if none provided, for testing purposes
            const testVariables = variables || {
                candidateName: 'John Doe',
                jobTitle: 'Software Engineer',
                companyName: 'Acme Corp',
                interviewType: 'Technical',
                scheduledDate: new Date().toLocaleString(),
                meetingLink: 'https://meet.google.com/abc-defg-hij',
                offerUrl: 'https://hrm8.io/offer/123',
                verificationUrl: 'https://hrm8.io/verify/123',
                assessmentUrl: 'https://hrm8.io/assessment/123',
            };

            await emailService.sendTemplateEmail({
                to,
                templateId: id,
                variables: testVariables,
            });

            res.json({ success: true, message: `Test email sent to ${to}` });
        } catch (error) {
            console.error('Send Test Email Error:', error);
            res.status(500).json({ success: false, message: 'Failed to send test email' });
        }
    }
}
