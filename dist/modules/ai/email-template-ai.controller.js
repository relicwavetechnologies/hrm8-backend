"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateAIController = void 0;
const email_template_ai_service_1 = require("./email-template-ai.service");
class EmailTemplateAIController {
    static async generateTemplate(req, res) {
        try {
            const { type, jobTitle, companyName, candidateName, context, tone, jobId, jobRoundId, roundName } = req.body;
            const template = await email_template_ai_service_1.EmailTemplateAIService.generateTemplate({
                type: type || 'custom',
                jobTitle: jobTitle || 'Position',
                companyName: companyName || 'Our Company',
                candidateName: candidateName || 'Candidate',
                context,
                tone,
                jobId: jobId || undefined,
                jobRoundId: jobRoundId || undefined,
                roundName: roundName || undefined
            });
            res.json({ success: true, data: template });
        }
        catch (error) {
            console.error('Template Generation Error:', error);
            res.status(500).json({ success: false, message: 'Failed to generate template' });
        }
    }
    static async rewriteText(req, res) {
        try {
            const { text, field, instruction, tone, context } = req.body;
            if (!text || !instruction) {
                return res.status(400).json({ success: false, message: 'Text and instruction are required' });
            }
            const rewritten = await email_template_ai_service_1.EmailTemplateAIService.rewriteText({
                text,
                field: field || 'body',
                instruction,
                tone,
                context
            });
            res.json({ success: true, data: { text: rewritten } });
        }
        catch (error) {
            console.error('Template Rewrite Error:', error);
            res.status(500).json({ success: false, message: 'Failed to rewrite text' });
        }
    }
}
exports.EmailTemplateAIController = EmailTemplateAIController;
