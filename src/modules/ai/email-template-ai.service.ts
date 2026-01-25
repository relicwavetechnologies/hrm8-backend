import OpenAI from 'openai';

export interface GenerateEmailRequest {
  type: string; // e.g., 'interview_invitation', 'rejection'
  jobTitle: string;
  companyName: string;
  candidateName: string; // Used for context, but template should use {{candidateName}}
  context?: string; // Additional instructions
}

export class EmailTemplateAIService {
  static async generateTemplate(request: GenerateEmailRequest): Promise<{ subject: string; body: string }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return this.fallbackGenerate(request);
    }

    const openai = new OpenAI({ apiKey });
    
    const systemPrompt = `You are an expert HR communications specialist. Create professional, empathetic, and clear email templates.
    The output should be a JSON object: { "subject": "string", "body": "string" }.
    Use Handlebars-style variables for dynamic content: {{candidateName}}, {{jobTitle}}, {{companyName}}, {{senderName}}.
    Do not fill in the real values for these variables in the output, use the placeholders.`;

    const userPrompt = `Create an email template for: ${request.type}.
    Job: ${request.jobTitle}
    Company: ${request.companyName}
    Context/Tone: ${request.context || 'Professional and polite'}
    
    Ensure the body includes placeholders like {{candidateName}} where appropriate.`;

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
      if (!content) throw new Error('Empty response');

      return JSON.parse(content);
    } catch (error) {
      console.error('Email template generation error:', error);
      return this.fallbackGenerate(request);
    }
  }

  static async enhanceTemplate(currentBody: string, instructions: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return currentBody;

    const openai = new OpenAI({ apiKey });
    
    try {
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an email editor. Improve the email content based on instructions. Keep existing variables like {{name}} intact.' },
                { role: 'user', content: `Original: ${currentBody}\n\nInstructions: ${instructions}` }
            ]
        });
        return completion.choices[0]?.message?.content || currentBody;
    } catch (error) {
        return currentBody;
    }
  }

  private static fallbackGenerate(request: GenerateEmailRequest): { subject: string; body: string } {
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
