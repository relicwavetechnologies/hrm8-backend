"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentQuestionGenerationService = void 0;
const openai_1 = __importDefault(require("openai"));
class AssessmentQuestionGenerationService {
    static async generateQuestions(request) {
        const { jobTitle, jobDescription = '', questionCount = 5 } = request;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return this.fallbackGenerate(jobTitle, questionCount);
        }
        const openai = new openai_1.default({ apiKey });
        const systemPrompt = `You are an expert recruiter creating assessment questions for candidate evaluation rounds.
Output a JSON object with a "questions" array. Each question must have:
- questionText: string
- type: one of "MULTIPLE_CHOICE", "MULTIPLE_SELECT", "SHORT_ANSWER", "LONG_ANSWER", "CODE"
- options: string[] (required only for MULTIPLE_CHOICE and MULTIPLE_SELECT, 2-6 options each)

Include a mix of question types. For MULTIPLE_CHOICE/MULTIPLE_SELECT, provide sensible options.`;
        const userPrompt = `Generate ${questionCount} assessment questions for the role: ${jobTitle}.
${jobDescription ? `Job Description (excerpt): ${jobDescription.substring(0, 1500)}` : ''}

Create professional questions that evaluate candidate fit, skills, and experience. Include behavioral and role-relevant questions.`;
        try {
            const completion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                response_format: { type: 'json_object' },
            });
            const content = completion.choices[0]?.message?.content;
            if (!content)
                throw new Error('Empty response');
            const parsed = JSON.parse(content);
            const raw = Array.isArray(parsed) ? parsed : parsed.questions || [];
            return this.validateAndFormat(raw, questionCount);
        }
        catch (error) {
            console.error('Assessment question generation error:', error);
            return this.fallbackGenerate(jobTitle, questionCount);
        }
    }
    static validateAndFormat(raw, maxCount) {
        const valid = [];
        const validTypes = [
            'MULTIPLE_CHOICE',
            'MULTIPLE_SELECT',
            'SHORT_ANSWER',
            'LONG_ANSWER',
            'CODE',
        ];
        for (let i = 0; i < Math.min(raw.length, maxCount); i++) {
            const q = raw[i];
            const text = q?.questionText ?? q?.text ?? q?.question ?? '';
            if (!text || typeof text !== 'string')
                continue;
            let type = 'LONG_ANSWER';
            if (validTypes.includes(q?.type)) {
                type = q.type;
            }
            else if (q?.type === 'multiple_choice' || q?.type === 'mc') {
                type = 'MULTIPLE_CHOICE';
            }
            else if (q?.type === 'short' || q?.type === 'text') {
                type = 'SHORT_ANSWER';
            }
            let options;
            if (type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_SELECT') {
                const opts = q?.options ?? q?.choices ?? [];
                options = Array.isArray(opts)
                    ? opts.map((o) => (typeof o === 'string' ? o : String(o?.value ?? o)))
                    : ['Yes', 'No'];
                if (options.length < 2)
                    options = ['Yes', 'No'];
            }
            valid.push({ questionText: text.trim(), type, options, order: valid.length });
        }
        return valid;
    }
    static fallbackGenerate(jobTitle, count) {
        const defaults = [
            {
                questionText: `Why are you interested in the ${jobTitle} role?`,
                type: 'LONG_ANSWER',
                order: 0,
            },
            {
                questionText: 'Describe a challenging project you worked on. How did you approach it?',
                type: 'LONG_ANSWER',
                order: 1,
            },
            {
                questionText: 'How many years of relevant experience do you have?',
                type: 'MULTIPLE_CHOICE',
                options: ['0-1 years', '1-3 years', '3-5 years', '5+ years'],
                order: 2,
            },
            {
                questionText: 'What is your preferred work arrangement?',
                type: 'MULTIPLE_CHOICE',
                options: ['Remote', 'On-site', 'Hybrid'],
                order: 3,
            },
            {
                questionText: 'Summarize your key strengths in one paragraph.',
                type: 'SHORT_ANSWER',
                order: 4,
            },
        ];
        return defaults.slice(0, count);
    }
}
exports.AssessmentQuestionGenerationService = AssessmentQuestionGenerationService;
