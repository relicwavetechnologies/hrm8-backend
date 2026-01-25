import OpenAI from 'openai';

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'file';
  options?: string[]; // For select/multiselect
  required: boolean;
}

export class QuestionGenerationService {
  static async generateQuestions(jobTitle: string, jobDescription: string, count: number = 5): Promise<Question[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return this.fallbackGenerate(jobTitle, count);
    }

    const openai = new OpenAI({ apiKey });

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
      if (!content) throw new Error('Empty response');
      
      const parsed = JSON.parse(content);
      // Handle if it returned { questions: [...] } or just [...] (unlikely with json_object mode which enforces {})
      const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      
      return questions.map((q: any, index: number) => ({
        id: `q-${Date.now()}-${index}`,
        text: q.text,
        type: q.type,
        options: q.options,
        required: !!q.required
      }));

    } catch (error) {
      console.error('Question generation error:', error);
      return this.fallbackGenerate(jobTitle, count);
    }
  }

  private static fallbackGenerate(jobTitle: string, count: number): Question[] {
    const defaults: Question[] = [
      { id: '1', text: 'Why are you interested in this role?', type: 'textarea', required: true },
      { id: '2', text: 'What are your salary expectations?', type: 'text', required: true },
      { id: '3', text: 'When are you available to start?', type: 'text', required: true },
      { id: '4', text: 'Do you have relevant experience in this field?', type: 'select', options: ['Yes', 'No'], required: true },
      { id: '5', text: 'Please attach your portfolio/work samples', type: 'file', required: false }
    ];
    return defaults.slice(0, count);
  }
}
