"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiTemplateGeneratorService = exports.AITemplateGeneratorService = void 0;
const service_1 = require("../../core/service");
const config_service_1 = require("../system/config.service");
const openai_1 = __importDefault(require("openai"));
class AITemplateGeneratorService extends service_1.BaseService {
    /**
     * Generate a full job template using AI from a broad prompt
     */
    async generateTemplate(request) {
        const apiKey = await config_service_1.ConfigService.getOpenAIApiKey();
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        const openai = new openai_1.default({ apiKey });
        const model = await config_service_1.ConfigService.getOpenAIModel();
        const systemPrompt = `You are an expert HR professional. Generate a highly professional job template based on the user's brief request. 
    The response must be a JSON object containing a template name, a short description of the template, a category, and structured job data.
    
    Structure the response exactly as follows:
    {
      "name": "Template Name",
      "description": "Short description of when to use this template",
      "category": "One of: ENGINEERING, PRODUCT, DESIGN, MARKETING, SALES, OPERATIONS, HR, FINANCE, EXECUTIVE, OTHER",
      "jobData": {
        "title": "Professional Job Title",
        "description": "Detailed job overview (2-3 paragraphs)",
        "requirements": ["Requirement 1", "Requirement 2", ...],
        "responsibilities": ["Responsibility 1", "Responsibility 2", ...],
        "department": "Suggested Department",
        "employmentType": "full-time, part-time, contract, or casual",
        "experienceLevel": "entry, mid, senior, or executive"
      }
    }`;
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Please generate a job template for: ${request.prompt}` },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 3000,
        });
        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from AI');
        }
        return JSON.parse(content);
    }
}
exports.AITemplateGeneratorService = AITemplateGeneratorService;
exports.aiTemplateGeneratorService = new AITemplateGeneratorService();
