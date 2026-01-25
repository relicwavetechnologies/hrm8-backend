import OpenAI from 'openai';
import { prisma } from '../../utils/prisma';
import { env } from '../../config/env';
import { DocumentParserService } from '../storage/document-parser.service';
import { Application, Job, Candidate } from '@prisma/client';

export interface CandidateScoringRequest {
  applicationId: string;
  jobId: string;
}

export interface CandidateScoringResult {
  scores: {
    skills: number;
    experience: number;
    education: number;
    interview: number;
    culture: number;
    overall: number;
  };
  strengths: string[];
  concerns: string[];
  recommendation: 'strong_hire' | 'hire' | 'maybe' | 'no_hire' | 'strong_no_hire';
  justification: string;
  improvementAreas: string[];
  detailedAnalysis: {
    skillsAnalysis: string;
    experienceAnalysis: string;
    educationAnalysis: string;
    culturalFitAnalysis: string;
    overallAssessment: string;
  };
  summary: string;
  behavioralTraits: string[];
  communicationStyle: string;
  careerTrajectory: string;
  flightRisk: {
    level: 'Low' | 'Medium' | 'High';
    reason: string;
  };
  salaryBenchmark: {
    position: 'Below' | 'Within' | 'Above';
    marketRange: string;
  };
  culturalFit: {
    score: number;
    analysis: string;
    valuesMatched: string[];
  };
  analyzedAt: string;
}

export class CandidateScoringService {
  static async scoreCandidate(request: CandidateScoringRequest): Promise<CandidateScoringResult> {
    const apiKey = process.env.OPENAI_API_KEY; // Access directly as ConfigService replacement

    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      const application = await prisma.application.findUnique({
        where: { id: request.applicationId },
        include: { candidate: true, job: true }
      });

      if (!application) throw new Error('Application not found');
      if (!application.job) throw new Error('Job not found');
      if (!application.candidate) throw new Error('Candidate data not found in application');

      const job = application.job;
      const candidate = application.candidate;

      // Extract resume text
      let resumeText: string | undefined;
      if (application.resume_url) {
        if (application.resume_url.startsWith('mock://') || application.resume_url.startsWith('mock:')) {
          console.log(`ℹ️ Skipping mock resume URL: ${application.resume_url}`);
        } else if (!application.resume_url.startsWith('http')) {
           console.log(`ℹ️ Skipping invalid resume URL scheme: ${application.resume_url}`);
        } else {
          try {
            const response = await fetch(application.resume_url);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const contentType = response.headers.get('content-type') || 'application/pdf';
              
              // Simple parser selection logic
              const file: any = {
                  buffer,
                  mimetype: contentType
              };
              
              if (application.resume_url.toLowerCase().endsWith('.pdf')) file.mimetype = 'application/pdf';
              else if (application.resume_url.toLowerCase().endsWith('.docx')) file.mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              
              const parsed = await DocumentParserService.parseDocument(file);
              resumeText = parsed.text;
            }
          } catch (error) {
            console.warn('⚠️ Failed to extract resume text:', error);
          }
        }
      }

      const jobDetails = this.buildJobDetailsString(job);
      const candidateDetails = this.buildCandidateDetailsString(application, candidate, resumeText);

      const openai = new OpenAI({ apiKey });
      const systemPrompt = `You are an expert HR recruiter... (Same prompt as original)`; // Shortened for brevity in tool call, but I will include full prompt in actual file
      
      // ... I will copy the full prompt logic ...
      
      // Constructing prompts...
      const fullSystemPrompt = `You are an expert HR recruiter and talent acquisition specialist with deep expertise in candidate evaluation. Your role is to provide comprehensive, objective, and data-driven analysis of candidates.

Analyze candidates based on:
1. **Skills Match**: Technical and soft skills alignment with job requirements
2. **Experience Relevance**: Depth and relevance of work experience
3. **Education Background**: Educational qualifications and certifications
4. **Interview Performance**: If interview feedback is available
5. **Cultural Fit**: Alignment with company values and team dynamics
6. **Behavioral Profile**: Psychological traits, communication style, and potential team dynamics
7. **Retention Risk**: Likelihood of the candidate staying long-term based on history
8. **Market Value**: Estimated compensation alignment

Provide detailed analysis with specific examples and evidence from the candidate's profile.`;

      const userPrompt = `Analyze this candidate for the following position:

${jobDetails}

---

**CANDIDATE PROFILE:**

${candidateDetails}

---

**ANALYSIS REQUIREMENTS:**

Provide a comprehensive analysis including:

1. **Individual Scores (0-100 scale)** for:
   - Skills Match
   - Experience Relevance
   - Education Background
   - Interview Performance (if available, otherwise use 0)
   - Cultural Fit
   - Overall Weighted Score

2. **Strengths** (3-5 specific points with evidence)

3. **Concerns/Gaps** (3-5 specific points with evidence)

4. **Hiring Recommendation** (strong_hire, hire, maybe, no_hire, strong_no_hire)

5. **Detailed Justification** (2-3 paragraphs explaining the recommendation)

6. **Improvement Areas** (specific areas the candidate could improve)

7. **Detailed Analysis Sections**:
   - Skills Analysis: Detailed breakdown of skills match
   - Experience Analysis: Detailed assessment of work experience
   - Education Analysis: Assessment of educational background
   - Cultural Fit Analysis: Assessment of cultural alignment
   - Overall Assessment: Comprehensive summary

8. **Enhanced Insights**:
   - **Executive Summary**: A concise 2-3 sentence bio of the candidate.
   - **Behavioral Traits**: List 3-5 key personality traits (e.g., "Leadership", "Analytical").
   - **Communication Style**: Describe how they communicate (e.g., "Direct", "Collaborative").
   - **Career Trajectory**: Describe their growth pattern (e.g., "Fast-tracked", "Stable").
   - **Flight Risk**: Assess risk (Low/Medium/High) and provide a reason based on tenure history.
   - **Salary Benchmark**: Estimate if they are Below/Within/Above market rate for this role.
   - **Cultural Fit Detail**: Score (0-100) and list specific company values they match.

Be specific, objective, and provide actionable insights.`;

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_comprehensive_candidate_score',
              description: 'Provide comprehensive candidate scoring and detailed analysis',
              parameters: {
                type: 'object',
                properties: {
                  scores: {
                    type: 'object',
                    properties: {
                      skills: { type: 'number', minimum: 0, maximum: 100 },
                      experience: { type: 'number', minimum: 0, maximum: 100 },
                      education: { type: 'number', minimum: 0, maximum: 100 },
                      interview: { type: 'number', minimum: 0, maximum: 100 },
                      culture: { type: 'number', minimum: 0, maximum: 100 },
                      overall: { type: 'number', minimum: 0, maximum: 100 },
                    },
                    required: ['skills', 'experience', 'education', 'interview', 'culture', 'overall'],
                  },
                  strengths: { type: 'array', items: { type: 'string' } },
                  concerns: { type: 'array', items: { type: 'string' } },
                  recommendation: { type: 'string', enum: ['strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire'] },
                  justification: { type: 'string' },
                  improvementAreas: { type: 'array', items: { type: 'string' } },
                  detailedAnalysis: {
                    type: 'object',
                    properties: {
                      skillsAnalysis: { type: 'string' },
                      experienceAnalysis: { type: 'string' },
                      educationAnalysis: { type: 'string' },
                      culturalFitAnalysis: { type: 'string' },
                      overallAssessment: { type: 'string' },
                    },
                    required: ['skillsAnalysis', 'experienceAnalysis', 'educationAnalysis', 'culturalFitAnalysis', 'overallAssessment'],
                  },
                  summary: { type: 'string' },
                  behavioralTraits: { type: 'array', items: { type: 'string' } },
                  communicationStyle: { type: 'string' },
                  careerTrajectory: { type: 'string' },
                  flightRisk: {
                    type: 'object',
                    properties: {
                      level: { type: 'string', enum: ['Low', 'Medium', 'High'] },
                      reason: { type: 'string' }
                    },
                    required: ['level', 'reason']
                  },
                  salaryBenchmark: {
                    type: 'object',
                    properties: {
                      position: { type: 'string', enum: ['Below', 'Within', 'Above'] },
                      marketRange: { type: 'string' }
                    },
                    required: ['position', 'marketRange']
                  },
                  culturalFit: {
                    type: 'object',
                    properties: {
                      score: { type: 'number', minimum: 0, maximum: 100 },
                      analysis: { type: 'string' },
                      valuesMatched: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['score', 'analysis', 'valuesMatched']
                  }
                },
                required: ['scores', 'strengths', 'concerns', 'recommendation', 'justification', 'improvementAreas', 'detailedAnalysis', 'summary', 'behavioralTraits', 'communicationStyle', 'careerTrajectory', 'flightRisk', 'salaryBenchmark', 'culturalFit'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'provide_comprehensive_candidate_score' } },
      });

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error('No tool call in OpenAI response');

      const result = JSON.parse(toolCall.function.arguments);
      return { ...result, analyzedAt: new Date().toISOString() };

    } catch (error) {
      console.error('Candidate scoring error:', error);
      throw error;
    }
  }

  private static buildJobDetailsString(job: Job): string {
    const parts: string[] = [];
    parts.push(`**Job Title:** ${job.title}`);
    if (job.department) parts.push(`**Department:** ${job.department}`);
    if (job.location) parts.push(`**Location:** ${job.location}`);
    
    // Add logic for requirements/responsibilities if arrays exist
    if (job.description) parts.push(`\n**Job Description:**\n${job.description}`);
    
    return parts.join('\n');
  }

  private static buildCandidateDetailsString(application: Application, candidate: Candidate, resumeText?: string): string {
    const parts: string[] = [];
    parts.push(`**Candidate Name:** ${candidate.first_name} ${candidate.last_name}`);
    if (candidate.email) parts.push(`**Email:** ${candidate.email}`);
    if (resumeText) parts.push(`\n**Resume:**\n${resumeText.substring(0, 5000)}`);
    return parts.join('\n');
  }
}
