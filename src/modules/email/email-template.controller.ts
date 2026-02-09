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
    static async create(req: AuthenticatedRequest, res: Response) {
        try {
            const template = await EmailTemplateService.create({
                ...req.body,
                type: normalizeTemplateType(req.body.type) || 'CUSTOM',
                company: { connect: { id: req.user?.companyId } },
                user: { connect: { id: req.user?.id } },
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
            const { type, jobId, jobRoundId } = req.query;
            const filters: any = {
                company_id: req.user?.companyId
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
