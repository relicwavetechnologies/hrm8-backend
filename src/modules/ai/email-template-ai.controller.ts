
import { Request, Response } from 'express';
import { EmailTemplateAIService } from './email-template-ai.service';

export class EmailTemplateAIController {
    static async generateTemplate(req: Request, res: Response) {
        try {
            const { type, jobTitle, companyName, candidateName, context, tone } = req.body;

            const template = await EmailTemplateAIService.generateTemplate({
                type: type || 'custom',
                jobTitle: jobTitle || 'Position',
                companyName: companyName || 'Our Company',
                candidateName: candidateName || 'Candidate',
                context,
                tone
            });

            res.json({ success: true, data: template });
        } catch (error) {
            console.error('Template Generation Error:', error);
            res.status(500).json({ success: false, message: 'Failed to generate template' });
        }
    }

    static async rewriteText(req: Request, res: Response) {
        try {
            const { text, field, instruction, tone, context } = req.body;

            if (!text || !instruction) {
                return res.status(400).json({ success: false, message: 'Text and instruction are required' });
            }

            const rewritten = await EmailTemplateAIService.rewriteText({
                text,
                field: field || 'body',
                instruction,
                tone,
                context
            });

            res.json({ success: true, data: { text: rewritten } });
        } catch (error) {
            console.error('Template Rewrite Error:', error);
            res.status(500).json({ success: false, message: 'Failed to rewrite text' });
        }
    }
}
