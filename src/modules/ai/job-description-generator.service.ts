import { BaseService } from '../../core/service';
import { ConfigService } from '../system/config.service';
import OpenAI from 'openai';

export interface JobDescriptionGenerationRequest {
  title: string;
  numberOfVacancies?: number;
  department?: string;
  location?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'casual';
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  workArrangement?: 'on-site' | 'remote' | 'hybrid';
  tags?: string[];
  serviceType?: string;
  existingDescription?: string;
  existingRequirements?: string[];
  existingResponsibilities?: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'annual';
  salaryDescription?: string;
  hideSalary?: boolean;
  closeDate?: string;
  visibility?: 'public' | 'private';
  stealth?: boolean;
  additionalContext?: string;
}

export interface GeneratedJobDescription {
  description: string;
  requirements: string[];
  responsibilities: string[];
}

export class JobDescriptionGeneratorService extends BaseService {
  /**
   * Generate job description using OpenAI with ALL available context
   */
  async generateWithAI(request: JobDescriptionGenerationRequest): Promise<GeneratedJobDescription> {
    const apiKey = await ConfigService.getOpenAIApiKey();

    if (!apiKey) {
      console.log('OpenAI API key not found, falling back to pattern generation');
      return this.generateWithPattern(request);
    }

    try {
      const openai = new OpenAI({ apiKey });
      // Build comprehensive prompt
      const prompt = this.buildPrompt(request);
      const model = await ConfigService.getOpenAIModel();

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR professional and job description writer. Generate professional, compelling job descriptions that attract top talent. Use ALL provided context to create a tailored, accurate description. Always return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const generated = JSON.parse(content);
      return {
        description: generated.description || '',
        requirements: Array.isArray(generated.requirements) ? generated.requirements : [],
        responsibilities: Array.isArray(generated.responsibilities) ? generated.responsibilities : [],
      };
    } catch (error) {
      console.error('OpenAI generation failed, falling back to pattern generation:', error);
      return this.generateWithPattern(request);
    }
  }

  private buildPrompt(request: JobDescriptionGenerationRequest): string {
    const parts: string[] = [];
    parts.push(`Generate a comprehensive job description for the following position:\n\n`);
    parts.push(`**Job Title:** ${request.title}`);
    if (request.department) parts.push(`**Department:** ${request.department}`);
    if (request.location) parts.push(`**Location:** ${request.location}`);
    if (request.employmentType) parts.push(`**Employment Type:** ${request.employmentType}`);
    if (request.experienceLevel) parts.push(`**Experience Level:** ${request.experienceLevel}`);
    if (request.workArrangement) parts.push(`**Work Arrangement:** ${request.workArrangement}`);
    if (request.numberOfVacancies && request.numberOfVacancies > 1) {
      parts.push(`**Number of Vacancies:** ${request.numberOfVacancies}`);
    }
    if (request.tags && request.tags.length > 0) {
      parts.push(`**Tags:** ${request.tags.join(', ')}`);
    }

    if (request.salaryMin || request.salaryMax) {
      parts.push(`\n**Compensation:**`);
      if (!request.hideSalary) {
        if (request.salaryMin && request.salaryMax) {
          parts.push(`Salary Range: ${request.salaryMin} - ${request.salaryMax} ${request.salaryCurrency || 'USD'} ${request.salaryPeriod || 'per year'}`);
        } else if (request.salaryMin) {
          parts.push(`Minimum Salary: ${request.salaryMin} ${request.salaryCurrency || 'USD'} ${request.salaryPeriod || 'per year'}`);
        } else if (request.salaryMax) {
          parts.push(`Maximum Salary: ${request.salaryMax} ${request.salaryCurrency || 'USD'} ${request.salaryPeriod || 'per year'}`);
        }
      } else {
        parts.push(`Salary: Not disclosed`);
      }
      if (request.salaryDescription) {
        parts.push(`Salary Details: ${request.salaryDescription}`);
      }
    }

    if (request.existingDescription) {
      parts.push(`\n**Existing Description (use as reference/guidance):**\n${request.existingDescription.substring(0, 500)}`);
    }
    if (request.existingRequirements && request.existingRequirements.length > 0) {
      parts.push(`\n**Existing Requirements (build upon these):**\n${request.existingRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
    }
    if (request.existingResponsibilities && request.existingResponsibilities.length > 0) {
      parts.push(`\n**Existing Responsibilities (build upon these):**\n${request.existingResponsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
    }

    if (request.additionalContext) {
      parts.push(`\n**Additional Context/Notes:**\n${request.additionalContext}`);
    }

    parts.push(`\n\nPlease generate:`);
    parts.push(`1. A compelling 2-3 paragraph job description`);
    parts.push(`2. 5-8 key requirements/qualifications (as an array of strings)`);
    parts.push(`3. 5-8 key responsibilities (as an array of strings)`);

    parts.push(`\nReturn ONLY a JSON object with this structure:`);
    parts.push(`{`);
    parts.push(`  "description": "text",`);
    parts.push(`  "requirements": [],`);
    parts.push(`  "responsibilities": []`);
    parts.push(`}`);

    return parts.join('\n');
  }

  private generateWithPattern(request: JobDescriptionGenerationRequest): GeneratedJobDescription {
    const experienceYears = {
      'entry': '1-2',
      'mid': '3-5',
      'senior': '5-8',
      'executive': '10+',
    }[request.experienceLevel || 'mid'] || '3-5';

    const workArrangementText = {
      'on-site': 'on-site',
      'remote': 'remote',
      'hybrid': 'hybrid',
    }[request.workArrangement || 'on-site'] || 'on-site';

    const description = `We are seeking a talented ${request.title} to join our ${request.department || 'team'}. This is a ${workArrangementText} position${request.location ? ` based in ${request.location}` : ''}.`;

    const requirements = [
      `${experienceYears} years of relevant experience`,
      'Strong technical skills and problem-solving abilities',
      'Excellent communication and collaboration skills',
    ];

    const responsibilities = [
      'Design and implement solutions that meet business requirements',
      'Collaborate with team members and stakeholders',
      'Participate in code reviews and technical discussions',
    ];

    return { description, requirements, responsibilities };
  }
}

export const jobDescriptionGeneratorService = new JobDescriptionGeneratorService();
