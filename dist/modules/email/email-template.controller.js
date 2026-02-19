"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateController = void 0;
const email_template_service_1 = require("./email-template.service");
const email_service_1 = require("./email.service");
function normalizeTemplateType(t) {
    if (!t)
        return 'CUSTOM';
    const u = t.toUpperCase();
    if (u === 'REJECTED')
        return 'REJECTION';
    return u;
}
class EmailTemplateController {
    static getContext(req) {
        return {
            userId: (req.user?.id || req.hrm8User?.id),
            companyId: (req.user?.companyId || req.query?.company_id || req.body?.company_id),
        };
    }
    static async create(req, res) {
        try {
            const { userId, companyId } = EmailTemplateController.getContext(req);
            if (!companyId) {
                return res.status(400).json({ success: false, message: 'company_id is required' });
            }
            const template = await email_template_service_1.EmailTemplateService.create({
                ...req.body,
                type: normalizeTemplateType(req.body.type) || 'CUSTOM',
                company: { connect: { id: companyId } },
                user: userId ? { connect: { id: userId } } : undefined,
                jobId: req.body.jobId || undefined,
                jobRoundId: req.body.jobRoundId || undefined
            });
            res.json({ success: true, data: template });
        }
        catch (error) {
            console.error('Create Template Error:', error);
            res.status(500).json({ success: false, message: 'Failed to create template' });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = { ...req.body };
            if (updateData.type) {
                updateData.type = normalizeTemplateType(updateData.type);
            }
            const template = await email_template_service_1.EmailTemplateService.update(id, updateData);
            res.json({ success: true, data: template });
        }
        catch (error) {
            console.error('Update Template Error:', error);
            res.status(500).json({ success: false, message: 'Failed to update template' });
        }
    }
    static async getOne(req, res) {
        try {
            const { id } = req.params;
            const template = await email_template_service_1.EmailTemplateService.findOne(id);
            if (!template) {
                return res.status(404).json({ success: false, message: 'Template not found' });
            }
            res.json({ success: true, data: template });
        }
        catch (error) {
            console.error('Get Template Error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch template' });
        }
    }
    static async getAll(req, res) {
        try {
            const { type, jobId, jobRoundId, company_id } = req.query;
            const { companyId } = EmailTemplateController.getContext(req);
            const filters = {
                company_id: companyId || company_id
            };
            if (type) {
                filters.type = normalizeTemplateType(type);
            }
            if (jobId) {
                filters.job_id = jobId;
            }
            if (jobRoundId) {
                filters.job_round_id = jobRoundId;
            }
            const templates = await email_template_service_1.EmailTemplateService.findAll(filters);
            res.json({ success: true, data: templates });
        }
        catch (error) {
            console.error('Get All Templates Error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch templates' });
        }
    }
    static async getVariables(_req, res) {
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
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch variables' });
        }
    }
    static async preview(req, res) {
        try {
            const { id } = req.params;
            const template = await email_template_service_1.EmailTemplateService.findOne(id);
            if (!template) {
                return res.status(404).json({ success: false, message: 'Template not found' });
            }
            const vars = (req.body?.variables || {});
            const fill = (input) => input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => vars[key] ?? `{{${key}}}`);
            res.json({
                success: true,
                data: {
                    subject: fill(template.subject || ''),
                    body: fill(template.body || ''),
                },
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to preview template' });
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            await email_template_service_1.EmailTemplateService.remove(id);
            res.json({ success: true, message: 'Template deleted' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete template' });
        }
    }
    static async sendTest(req, res) {
        try {
            const { id } = req.params;
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
            await email_service_1.emailService.sendTemplateEmail({
                to,
                templateId: id,
                variables: testVariables,
            });
            res.json({ success: true, message: `Test email sent to ${to}` });
        }
        catch (error) {
            console.error('Send Test Email Error:', error);
            res.status(500).json({ success: false, message: 'Failed to send test email' });
        }
    }
}
exports.EmailTemplateController = EmailTemplateController;
