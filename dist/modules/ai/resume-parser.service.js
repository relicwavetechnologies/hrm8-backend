"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeParserService = void 0;
const openai_1 = __importDefault(require("openai"));
const document_parser_service_1 = require("../storage/document-parser.service");
class ResumeParserService {
    static async parseResume(fileBuffer, mimetype) {
        try {
            // 1. Extract text from document
            const parsedDoc = await document_parser_service_1.DocumentParserService.parseDocument({ buffer: fileBuffer, mimetype });
            const text = parsedDoc.text;
            if (!text || text.trim().length === 0) {
                throw new Error('Could not extract text from resume');
            }
            // 2. Use OpenAI to parse text
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                return this.fallbackParse(text);
            }
            const openai = new openai_1.default({ apiKey });
            const systemPrompt = `You are an expert resume parser. Extract structured data from the resume text provided.
      Return a JSON object matching this structure:
      {
        "firstName": "string",
        "lastName": "string",
        "email": "string",
        "phone": "string",
        "location": { "city": "string", "state": "string", "country": "string" },
        "summary": "string",
        "linkedInUrl": "string",
        "portfolioUrl": "string",
        "skills": ["string"],
        "workExperience": [
          { "company": "string", "role": "string", "startDate": "YYYY-MM", "endDate": "YYYY-MM", "current": boolean, "description": "string", "location": "string" }
        ],
        "education": [
          { "institution": "string", "degree": "string", "field": "string", "startDate": "YYYY-MM", "endDate": "YYYY-MM", "grade": "string" }
        ],
        "certifications": [
          { "name": "string", "issuingOrg": "string", "issueDate": "YYYY-MM", "expiryDate": "YYYY-MM" }
        ],
        "languages": ["string"]
      }
      If a field is not found, return null or empty array. handle dates carefully.`;
            const completion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text.substring(0, 12000) } // Truncate to avoid token limits
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1,
            });
            const content = completion.choices[0]?.message?.content;
            if (!content)
                throw new Error('Empty response from OpenAI');
            const result = JSON.parse(content);
            return this.normalizeParsedData(result);
        }
        catch (error) {
            console.error('Resume parsing error:', error);
            // Fallback if AI fails but we have text
            throw error;
        }
    }
    static normalizeParsedData(data) {
        return {
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            phone: data.phone || '',
            location: data.location || {},
            summary: data.summary,
            linkedInUrl: data.linkedInUrl,
            portfolioUrl: data.portfolioUrl,
            skills: Array.isArray(data.skills) ? data.skills : [],
            workExperience: Array.isArray(data.workExperience) ? data.workExperience.map((exp) => ({
                ...exp,
                current: !!exp.current
            })) : [],
            education: Array.isArray(data.education) ? data.education : [],
            certifications: Array.isArray(data.certifications) ? data.certifications : [],
            languages: Array.isArray(data.languages) ? data.languages : []
        };
    }
    static fallbackParse(text) {
        // Very basic regex extraction as fallback
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
        const phoneRegex = /(\+?(\d{1,3})?[-. ]?)?(\(?\d{3}\)?[-. ]?)?\d{3}[-. ]?\d{4}/g;
        const emailMatch = text.match(emailRegex);
        const phoneMatch = text.match(phoneRegex);
        return {
            firstName: '',
            lastName: '',
            email: emailMatch ? emailMatch[0] : '',
            phone: phoneMatch ? phoneMatch[0] : '',
            skills: [],
            workExperience: [],
            education: [],
            summary: text.substring(0, 200) + '...'
        };
    }
}
exports.ResumeParserService = ResumeParserService;
