"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionGenerationService = void 0;
const openai_1 = __importDefault(require("openai"));
class QuestionGenerationService {
    static async generateQuestions(jobTitle, jobDescription, count = 5) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return this.fallbackGenerate(jobTitle, count);
        }
        const openai = new openai_1.default({ apiKey });
        const systemPrompt = `You are a recruiter generating screening questions for a job application.
    Output a JSON array of objects with fields: text (string), type (text|textarea|select|multiselect|file), options (string[] if applicable), required (boolean).`;
        const userPrompt = `Generate ${count} screening questions for the role of ${jobTitle}.
    Job Description: ${jobDescription.substring(0, 1000)}...
    
    Include a mix of behavioral and technical questions.`;
        try {
            const completion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' }, // Actually json_object expects valid JSON object, not array at root usually.
                // Better to ask for { questions: [] }
            });
            const content = completion.choices[0]?.message?.content;
            if (!content)
                throw new Error('Empty response');
            const parsed = JSON.parse(content);
            // Handle if it returned { questions: [...] } or just [...] (unlikely with json_object mode which enforces {})
            const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
            return questions.map((q, index) => ({
                id: `q-${Date.now()}-${index}`,
                text: q.text,
                type: q.type,
                options: q.options,
                required: !!q.required
            }));
        }
        catch (error) {
            console.error('Question generation error:', error);
            return this.fallbackGenerate(jobTitle, count);
        }
    }
    static fallbackGenerate(jobTitle, count) {
        const defaults = [
            { id: '1', text: 'Why are you interested in this role?', type: 'textarea', required: true },
            { id: '2', text: 'What are your salary expectations?', type: 'text', required: true },
            { id: '3', text: 'When are you available to start?', type: 'text', required: true },
            { id: '4', text: 'Do you have relevant experience in this field?', type: 'select', options: ['Yes', 'No'], required: true },
            { id: '5', text: 'Please attach your portfolio/work samples', type: 'file', required: false }
        ];
        return defaults.slice(0, count);
    }
    /**
     * Generate screening questions with full job/company context and varied question types.
     * Returns ApplicationQuestion-compatible shape for the Smart Job Wizard.
     */
    static async generateScreeningQuestions(input) {
        const { jobTitle, jobDescription = '', companyContext = '', department = '', experienceLevel = '', existingQuestions = [], count = 6, } = input;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return this.fallbackScreeningQuestions(jobTitle, count);
        }
        const openai = new openai_1.default({ apiKey });
        const systemPrompt = `You are an expert recruiter creating application screening questions.
Output a JSON object with a single key "questions" whose value is an array of question objects.
Each question must have: "label" (string), "type" (one of: short_text, long_text, yes_no, multiple_choice, dropdown, number, date, file_upload, checkbox), "required" (boolean), and optionally "options" (array of strings, for multiple_choice/dropdown/checkbox only).
Use a mix of question types: some short_text, some long_text for open-ended, yes_no for eligibility, multiple_choice or dropdown when fixed options make sense (e.g. years of experience, work authorization).`;
        const userParts = [
            `Generate ${count} screening questions for the role: ${jobTitle}.`,
            department ? `Department: ${department}.` : '',
            experienceLevel ? `Experience level: ${experienceLevel}.` : '',
            jobDescription ? `Job description (use for context):\n${jobDescription.substring(0, 1500)}` : '',
            companyContext ? `Company context:\n${companyContext.substring(0, 800)}` : '',
            existingQuestions.length > 0
                ? `Current questions (expand or improve, do not duplicate):\n${existingQuestions.map((q, i) => `${i + 1}. [${q.type}] ${q.label}`).join('\n')}`
                : '',
        ].filter(Boolean);
        try {
            const completion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userParts.join('\n\n') },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.6,
                max_tokens: 2000,
            });
            const content = completion.choices[0]?.message?.content;
            if (!content)
                throw new Error('Empty response');
            const parsed = JSON.parse(content);
            const raw = Array.isArray(parsed) ? parsed : parsed.questions || [];
            return raw.slice(0, count).map((q, index) => {
                const type = this.normalizeQuestionType(q.type);
                const options = Array.isArray(q.options) ? q.options : [];
                return {
                    id: `sq-${Date.now()}-${index}`,
                    type,
                    label: typeof q.label === 'string' ? q.label : String(q.label || `Question ${index + 1}`),
                    required: !!q.required,
                    order: index,
                    ...(options.length > 0 && ['multiple_choice', 'dropdown', 'checkbox'].includes(type)
                        ? {
                            options: options.map((opt, i) => ({
                                id: `opt-${i}`,
                                label: opt,
                                value: opt,
                            })),
                        }
                        : {}),
                };
            });
        }
        catch (error) {
            console.error('Screening question generation error:', error);
            return this.fallbackScreeningQuestions(jobTitle, count);
        }
    }
    static normalizeQuestionType(t) {
        const map = {
            short_text: 'short_text',
            long_text: 'long_text',
            yes_no: 'yes_no',
            multiple_choice: 'multiple_choice',
            dropdown: 'dropdown',
            number: 'number',
            date: 'date',
            file_upload: 'file_upload',
            checkbox: 'checkbox',
            text: 'short_text',
            textarea: 'long_text',
            select: 'dropdown',
            multiselect: 'checkbox',
            file: 'file_upload',
        };
        return map[t] || 'short_text';
    }
    static fallbackScreeningQuestions(jobTitle, count) {
        const defaults = [
            { id: '1', type: 'long_text', label: 'Why are you interested in this role?', required: true, order: 0 },
            { id: '2', type: 'short_text', label: 'What are your salary expectations?', required: true, order: 1 },
            { id: '3', type: 'short_text', label: 'When are you available to start?', required: true, order: 2 },
            {
                id: '4',
                type: 'yes_no',
                label: 'Do you have relevant experience in this field?',
                required: true,
                order: 3,
            },
            {
                id: '5',
                type: 'dropdown',
                label: 'Years of experience in this role?',
                required: true,
                order: 4,
                options: ['0-1', '1-3', '3-5', '5-10', '10+'].map((v, i) => ({ id: `o-${i}`, label: v, value: v })),
            },
            { id: '6', type: 'file_upload', label: 'Attach portfolio or work samples (optional)', required: false, order: 5 },
        ];
        return defaults.slice(0, Math.max(1, count)).map((q, i) => ({ ...q, id: `sq-fb-${Date.now()}-${i}`, order: i }));
    }
}
exports.QuestionGenerationService = QuestionGenerationService;
