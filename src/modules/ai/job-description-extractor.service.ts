import { BaseService } from '../../core/service';
import { ConfigService } from '../system/config.service';
import OpenAI from 'openai';

export interface ExtractedJobData {
    title?: string;
    description?: string;
    requirements: string[];
    responsibilities: string[];
    qualifications?: string[];
    benefits?: string[];
    salaryRange?: {
        min?: number;
        max?: number;
        currency?: string;
        period?: string;
    };
    location?: string;
    employmentType?: string;
    experienceLevel?: string;
    department?: string;
}

export class JobDescriptionExtractorService extends BaseService {
    /**
     * Extract job data using pattern matching (fallback when AI is not available)
     */
    async extractWithPatternMatching(text: string): Promise<ExtractedJobData> {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Extract title
        const titleMatch = text.match(/(?:Position|Title|Job Title|Role)[:]\s*(.+)/i) ||
            text.match(/^(.{5,80})$/m);
        const title = titleMatch ? titleMatch[1].trim() : undefined;

        // Extract description
        const descriptionKeywords = ['overview', 'summary', 'about the role', 'about this role', 'role description', 'position summary', 'job description'];
        let descriptionStart = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (descriptionKeywords.some(keyword => line.includes(keyword))) {
                descriptionStart = i + 1;
                break;
            }
        }
        if (descriptionStart === -1) descriptionStart = 0;

        const endKeywords = ['requirements', 'qualifications', 'responsibilities', 'duties', 'what you'];
        let descriptionEnd = Math.min(descriptionStart + 10, lines.length);
        for (let i = descriptionStart; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (endKeywords.some(keyword => line.includes(keyword))) {
                descriptionEnd = i;
                break;
            }
        }

        const description = lines.slice(descriptionStart, descriptionEnd)
            .filter(line => line.length > 20)
            .join('\n\n')
            .substring(0, 1000);

        // Extract requirements
        const requirements = this.extractSection(text, [
            'requirements', 'qualifications', 'must have', 'required', 'essential', 'skills required'
        ], [
            'responsibilities', 'duties', 'what you', 'benefits'
        ]);

        // Extract responsibilities
        const responsibilities = this.extractSection(text, [
            'responsibilities', 'duties', 'what you will do', 'what you\'ll do', 'key duties', 'role responsibilities'
        ], [
            'requirements', 'qualifications', 'benefits', 'compensation'
        ]);

        // Extract location
        const locationMatch = text.match(/(?:Location|Based in|Office location)[:]\s*(.+)/i);
        const location = locationMatch ? locationMatch[1].trim() : undefined;

        // Extract employment type
        const employmentTypeMatch = text.match(/(?:Employment Type|Type|Contract Type)[:]\s*(.+)/i) ||
            text.match(/(Full-time|Part-time|Contract|Casual|Permanent|Temporary)/i);
        const employmentType = employmentTypeMatch ? employmentTypeMatch[1].toLowerCase().replace('-', '-') : undefined;

        return {
            title,
            description: description || undefined,
            requirements: requirements.slice(0, 10),
            responsibilities: responsibilities.slice(0, 10),
            location,
            employmentType,
        };
    }

    private extractSection(
        text: string,
        startKeywords: string[],
        endKeywords: string[]
    ): string[] {
        const lines = text.split('\n').map(line => line.trim());
        const items: string[] = [];
        let inSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lowerLine = line.toLowerCase();

            if (startKeywords.some(keyword => lowerLine.includes(keyword))) {
                inSection = true;
                continue;
            }

            if (inSection && endKeywords.some(keyword => lowerLine.includes(keyword))) {
                break;
            }

            if (inSection && line.length > 0) {
                const cleaned = line
                    .replace(/^[-•*]\s*/, '')
                    .replace(/^\d+[\.)]\s*/, '')
                    .trim();

                if (cleaned.length > 10 && cleaned.length < 500) {
                    items.push(cleaned);
                }
            }
        }

        return items;
    }

    /**
     * Extract job data using OpenAI
     */
    async extractWithAI(text: string): Promise<ExtractedJobData> {
        const apiKey = await ConfigService.getOpenAIApiKey();

        if (!apiKey) {
            console.warn('OpenAI API key not found, falling back to pattern matching');
            return this.extractWithPatternMatching(text);
        }

        try {
            const openai = new OpenAI({ apiKey });
            const truncatedText = text.substring(0, 12000);
            const model = await ConfigService.getOpenAIModel();

            const prompt = `Extract job information from this position description. Return a JSON object with:
- title: Job title (string)
- description: Job description/overview, 2-3 paragraphs (string)
- requirements: Array of required skills/qualifications, max 10 items (string[])
- responsibilities: Array of key responsibilities, max 10 items (string[])
- qualifications: Array of preferred qualifications, optional (string[])
- benefits: Array of benefits mentioned, optional (string[])
- salaryRange: Object with min (number), max (number), currency (string), period (string) if mentioned
- location: Job location if mentioned (string)
- employmentType: full-time, part-time, contract, or casual if mentioned (string)
- experienceLevel: entry, mid, senior, or executive if mentioned (string)
- department: Department name if mentioned (string)

Document text:
${truncatedText}

Return ONLY valid JSON, no markdown formatting, no code blocks.`;

            const completion = await openai.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at extracting structured data from job descriptions. Always return valid JSON only, no markdown.',
                    },
                    { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3,
                max_tokens: 2000,
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from OpenAI');
            }

            const extracted = JSON.parse(content);
            return this.normalizeExtractedData(extracted);
        } catch (error) {
            console.error('OpenAI extraction failed, falling back to pattern matching:', error);
            return this.extractWithPatternMatching(text);
        }
    }

    private normalizeExtractedData(data: any): ExtractedJobData {
        return {
            title: typeof data.title === 'string' ? data.title.trim() : undefined,
            description: typeof data.description === 'string' ? data.description.trim() : undefined,
            requirements: Array.isArray(data.requirements)
                ? data.requirements
                    .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
                    .map((item: string) => item.trim())
                    .slice(0, 10)
                : [],
            responsibilities: Array.isArray(data.responsibilities)
                ? data.responsibilities
                    .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
                    .map((item: string) => item.trim())
                    .slice(0, 10)
                : [],
            qualifications: Array.isArray(data.qualifications)
                ? data.qualifications
                    .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
                    .map((item: string) => item.trim())
                : undefined,
            benefits: Array.isArray(data.benefits)
                ? data.benefits
                    .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
                    .map((item: string) => item.trim())
                : undefined,
            salaryRange: data.salaryRange && typeof data.salaryRange === 'object'
                ? {
                    min: typeof data.salaryRange.min === 'number' ? data.salaryRange.min : undefined,
                    max: typeof data.salaryRange.max === 'number' ? data.salaryRange.max : undefined,
                    currency: typeof data.salaryRange.currency === 'string' ? data.salaryRange.currency : undefined,
                    period: typeof data.salaryRange.period === 'string' ? data.salaryRange.period : undefined,
                }
                : undefined,
            location: typeof data.location === 'string' ? data.location.trim() : undefined,
            employmentType: typeof data.employmentType === 'string' ? data.employmentType.toLowerCase().trim() : undefined,
            experienceLevel: typeof data.experienceLevel === 'string' ? data.experienceLevel.toLowerCase().trim() : undefined,
            department: typeof data.department === 'string' ? data.department.trim() : undefined,
        };
    }
}

export const jobDescriptionExtractorService = new JobDescriptionExtractorService();
