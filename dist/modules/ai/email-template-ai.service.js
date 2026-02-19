"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateAIService = void 0;
const openai_1 = __importDefault(require("openai"));
class EmailTemplateAIService {
    static async generateTemplate(request) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return this.fallbackGenerate(request);
        }
        const openai = new openai_1.default({ apiKey });
        // Strictly match variables supported by TEMPLATE_VARIABLES in frontend
        const supportedVariables = [
            '{{candidate.firstName}}', '{{candidate.lastName}}', '{{candidate.current_company}}', '{{candidate.current_designation}}',
            '{{job.title}}', '{{job.location}}', '{{job.salary_min}}', '{{job.salary_max}}',
            '{{job.hiringManager.name}}', '{{job.hiringManager.email}}',
            '{{company.name}}', '{{company.website}}',
            '{{interviewer.name}}', '{{interviewer.email}}',
            '{{candidateName}}', '{{jobTitle}}', '{{companyName}}', '{{senderName}}' // Legacy support
        ];
        const systemPrompt = `You are an expert HR communications specialist at a top-tier recruitment firm. Your goal is to write professional, engaging, and clear emails.
    
    OUTPUT FORMAT:
    Return a JSON object: { "subject": "string", "body": "string" }.
    
    FORMATTING RULES (CRITICAL):
    1. Use HTML strictly for the "body" field.
    2. Use <p> for paragraphs.
    3. Use <b> or <strong> for emphasis on key details (dates, roles).
    4. Use <ul> and <li> for lists (responsibilities, next steps).
    5. Use <br> for line breaks where necessary.
    6. DO NOT use Markdown (no **, no ##).

    VARIABLE RULES:
    1. You MUST use ONLY these supported variables where appropriate: ${supportedVariables.join(', ')}.
    2. PREFER deep variables (e.g., {{candidate.firstName}} over {{candidateName}}) for better personalization.
    3. Do not invent variables like {{interviewDate}}. Use square brackets e.g., [Date] for information that needs manual entry if no variable exists.
    
    TONE: ${request.tone || 'Professional, warm, and respectful.'}`;
        const stageContext = request.roundName
            ? `\nSTAGE/ROUND: This email is for when a candidate enters the round "${request.roundName}".`
            : '';
        const userPrompt = `Create a ${request.tone || 'professional'} email template for a "${request.type}" stage.
    
    JOB DETAILS:
    Title: ${request.jobTitle}
    Company: ${request.companyName}${stageContext}
    
    ADDITIONAL CONTEXT:
    ${request.context || 'No specific context provided. Create a standard, well-structured template.'}
    
    INSTRUCTIONS:
    - Subject line should be concise and catchy.
    - Body should be ready to send, requiring minimal editing.
    - Use {{candidateName}}, {{jobTitle}}, {{companyName}} (and {{roundName}} if relevant) where appropriate.
    - If this is an interview invitation, include clear placeholders for Date/Time if variables aren't used.`;
        try {
            const completion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
            });
            const content = completion.choices[0]?.message?.content;
            if (!content)
                throw new Error('Empty response');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('Email template generation error:', error);
            return this.fallbackGenerate(request);
        }
    }
    static async enhanceTemplate(currentBody, instructions) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey)
            return currentBody;
        const openai = new openai_1.default({ apiKey });
        try {
            const completion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are an email editor. Improve the email content based on instructions. Keep existing variables like {{name}} intact.' },
                    { role: 'user', content: `Original: ${currentBody}\n\nInstructions: ${instructions}` }
                ]
            });
            return completion.choices[0]?.message?.content || currentBody;
        }
        catch (error) {
            return currentBody;
        }
    }
    static async rewriteText(request) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey)
            return request.text; // Fallback to returning original
        const openai = new openai_1.default({ apiKey });
        const fieldInstruction = request.field === 'subject'
            ? 'You are rewriting an email SUBJECT LINE only. Return ONLY the raw subject line text. Do not include "Subject:" prefix. Keep it concise.'
            : 'You are rewriting an email BODY only. Return ONLY the raw body text. Do not include a subject line. Do not include "Body:" prefix.';
        const systemPrompt = `${fieldInstruction}
    Tone: ${request.tone || 'Professional'}
    
    CRITICAL RULES:
    1. Preserve all Handlebars variables (e.g., {{candidateName}}, {{jobTitle}}) EXACTLY as they appear. Do NOT replace them.
    2. Do NOT add "Subject:" or "Body:" headers.
    3. Do NOT output a JSON object, just the raw plain text.`;
        try {
            const completion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Original Text: "${request.text}"\n\nInstruction: ${request.instruction}\nContext: ${request.context || ''}` }
                ],
                temperature: 0.7,
            });
            let content = completion.choices[0]?.message?.content || request.text;
            // Cleanup: remove surrounding quotes
            content = content.replace(/^["']|["']$/g, '');
            // Cleanup: remove "Subject:" prefix if AI ignored instructions
            if (request.field === 'subject') {
                content = content.replace(/^Subject:\s*/i, '');
            }
            // Cleanup: remove "Body:" prefix
            content = content.replace(/^Body:\s*/i, '');
            return content;
        }
        catch (error) {
            console.error('AI Rewrite error:', error);
            return request.text;
        }
    }
    static fallbackGenerate(request) {
        // Basic fallbacks
        switch (request.type) {
            case 'interview_invitation':
                return {
                    subject: 'Interview Invitation: {{jobTitle}} at {{companyName}}',
                    body: 'Hi {{candidateName}},\n\nWe were impressed by your application for the {{jobTitle}} position and would like to invite you for an interview.\n\nPlease let us know your availability.\n\nBest regards,\n{{senderName}}'
                };
            case 'rejection':
                return {
                    subject: 'Update on your application for {{jobTitle}}',
                    body: 'Dear {{candidateName}},\n\nThank you for applying to {{companyName}}. After careful consideration, we have decided to move forward with other candidates.\n\nWe wish you the best in your job search.\n\nSincerely,\n{{companyName}} Team'
                };
            default:
                return {
                    subject: ' regarding your application',
                    body: 'Hi {{candidateName}},\n\n[Content here]\n\nBest,\n{{senderName}}'
                };
        }
    }
}
exports.EmailTemplateAIService = EmailTemplateAIService;
