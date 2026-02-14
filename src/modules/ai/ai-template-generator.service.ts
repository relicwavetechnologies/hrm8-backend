import { BaseService } from '../../core/service';
import { ConfigService } from '../system/config.service';
import OpenAI from 'openai';

export interface AITemplateGenerationRequest {
    prompt: string;
}

export interface GeneratedJobTemplate {
    name: string;
    description: string;
    category: string;
    jobData: {
        title: string;
        description: string;
        requirements: string[];
        responsibilities: string[];
        department: string;
        employmentType: string;
        experienceLevel: string;
    };
}

export class AITemplateGeneratorService extends BaseService {
    /**
     * Generate a full job template using AI from a broad prompt
     */
    async generateTemplate(request: AITemplateGenerationRequest): Promise<GeneratedJobTemplate> {
        const apiKey = await ConfigService.getOpenAIApiKey();

        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const openai = new OpenAI({ apiKey });
        const model = await ConfigService.getOpenAIModel();

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

        return JSON.parse(content) as GeneratedJobTemplate;
    }
}

export const aiTemplateGeneratorService = new AITemplateGeneratorService();
