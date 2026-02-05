import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';
import { AssessRepository } from './assess.repository';
import {
  AssessRegistrationRequest,
  AssessLoginRequest,
  CreateInternalJobRequest
} from './assess.types';
import { hashPassword, comparePassword } from '../../utils/password';
import { WalletService } from '../wallet/wallet.service';
import { extractDomain } from '../../utils/domain';
import { generateToken } from '../../utils/token';
import { Prisma } from '@prisma/client';
import { DocumentParserService } from '../storage/document-parser.service';
import { ResumeParserService } from '../ai/resume-parser.service';

export class AssessService extends BaseService {
  private assessRepository: AssessRepository;

  constructor() {
    super();
    this.assessRepository = new AssessRepository();
  }

  // POST /api/assess/register - Register for assess platform
  async registerAssessUser(data: AssessRegistrationRequest) {
    const { email, password } = { email: data.email, password: 'TemporaryPassword123!' }; // Generate or use provided password

    // Check if company already exists by domain
    const companyDomain = extractDomain(data.companyWebsite);
    const existingCompany = await this.prisma.company.findFirst({
      where: { domain: companyDomain }
    });

    if (existingCompany) {
      throw new HttpException(409, 'A company with this domain already exists');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (existingUser) {
      throw new HttpException(409, 'A user with this email already exists');
    }

    const passwordHash = await hashPassword(password);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create company
      const company = await tx.company.create({
        data: {
          name: data.companyName.trim(),
          website: data.companyWebsite.trim(),
          domain: companyDomain,
          country_or_region: data.country,
          verification_status: 'PENDING',
        }
      });

      // 2. Create company profile
      await tx.companyProfile.create({
        data: {
          company_id: company.id,
          status: 'NOT_STARTED',
          profile_data: {
            industry: data.industry,
            size: data.companySize || '1-10',
            billingEmail: data.billingEmail || data.email.toLowerCase(),
            source: 'hrm8-assess',
          } as Prisma.InputJsonValue,
        }
      });

      // 3. Create admin user
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          name: `${data.firstName.trim()} ${data.lastName.trim()}`,
          password_hash: passwordHash,
          company_id: company.id,
          role: 'ADMIN',
          status: 'PENDING_VERIFICATION',
        }
      });

      // 4. Initialize wallet with 0 credits
      await WalletService.getOrCreateAccount('COMPANY', company.id);

      return { company, user };
    });
  }

  // POST /api/assess/login - Login for assess platform
  async loginAssessUser(data: AssessLoginRequest) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        company: true
      }
    });

    if (!user) {
      throw new HttpException(401, 'Invalid credentials');
    }

    if (data.password) {
      const isValid = await comparePassword(data.password, user.password_hash);
      if (!isValid) {
        throw new HttpException(401, 'Invalid credentials');
      }
    }

    if (user.status === 'INACTIVE') {
      throw new HttpException(403, 'Account is inactive');
    }

    // Return user info - actual session handling is done in the controller/middleware
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.company_id,
        companyName: user.company?.name
      }
    };
  }

  // GET /api/assess/me - Get current assess user
  async getAssessUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });
    if (!user) throw new HttpException(404, 'User not found');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.company?.name,
      role: user.role,
    };
  }

  // POST /api/assess/logout - Logout from assess
  async logoutAssessUser(userId: string) {
    return {
      message: 'Logged out successfully',
      userId,
    };
  }

  // GET /api/assess/job-options - Get available job options
  async getJobOptions(filters?: {
    location?: string;
    category?: string;
    employmentType?: string;
  }) {
    const where: any = {
      status: 'OPEN',
    };

    if (filters?.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters?.employmentType) {
      where.employment_type = filters.employmentType;
    }

    const jobs = await this.prisma.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        location: true,
        employment_type: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 20,
      orderBy: { created_at: 'desc' },
    });

    return jobs;
  }

  // POST /api/assess/recommendations - Get AI recommendations
  async getRecommendations(data: {
    userId?: string;
    skills?: string[];
    preferences?: any;
  }) {
    const userSkills = data.skills || [];

    // Simple matching algorithm - in real app, this would use AI
    const jobs = await this.prisma.job.findMany({
      where: {
        status: 'OPEN',
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        employment_type: true,
        company: {
          select: {
            name: true,
          },
        },
      },
      take: 10,
    });

    // Calculate match scores (simplified)
    const recommendations = jobs.map((job: any) => {
      const matchScore = 50; // Default score

      return {
        ...job,
        matchScore: Math.round(matchScore),
        matchingSkills: [],
      };
    });

    // Sort by match score
    recommendations.sort((a: any, b: any) => b.matchScore - a.matchScore);

    return recommendations;
  }

  // POST /api/assess/jobs - Create internal job posting
  async createInternalJob(data: CreateInternalJobRequest & { companyId: string, createdBy: string }) {
    // Map frontend values to Prisma enums
    const employmentTypeMap: Record<string, string> = {
      'full-time': 'FULL_TIME',
      'part-time': 'PART_TIME',
      'contract': 'CONTRACT',
      'casual': 'CASUAL',
    };

    const workArrangementMap: Record<string, string> = {
      'on-site': 'ON_SITE',
      'remote': 'REMOTE',
      'hybrid': 'HYBRID',
    };

    return this.assessRepository.createInternalJob({
      title: data.title,
      description: data.description,
      location: data.location || 'Remote',
      employment_type: employmentTypeMap[data.employmentType] || 'FULL_TIME',
      work_arrangement: workArrangementMap[data.workArrangement || 'on-site'] || 'ON_SITE',
      number_of_vacancies: data.vacancies || 1,
      requirements: data.requirements || [],
      responsibilities: data.responsibilities || [],
      company_id: data.companyId,
      created_by: data.createdBy,
      hiring_mode: 'ASSESSMENT_ONLY',
    });
  }

  // POST /api/assess/jobs/upload-description - Upload and parse JD
  async uploadPositionDescription(file: Express.Multer.File, companyId: string) {
    if (!file) throw new HttpException(400, 'File is required');

    const { uploadService } = await import('../../services/upload.service');
    const result = await uploadService.uploadFile(file, `assess/jobs/${companyId}`);

    // AI Parsing
    const parsedDoc = await DocumentParserService.parseDocument({ buffer: file.buffer, mimetype: file.mimetype });
    const text = parsedDoc.text;

    // AI Extraction of JD details
    let title = file.originalname.split('.')[0];
    let location = 'Remote';
    let employmentType = 'full-time';
    let requiredSkills: string[] = [];

    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `Extract following details from this job description text:
      1. Job Title
      2. Location (City, State, Country or "Remote")
      3. Employment Type (full-time, part-time, contract, casual)
      4. Required Skills (array of strings)
      
      Return as JSON.
      JD TEXT: ${text.substring(0, 5000)}`;

      const aiResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const extracted = JSON.parse(aiResponse.choices[0]?.message?.content || '{}');
      title = extracted.title || title;
      location = extracted.location || location;
      employmentType = extracted.employmentType || employmentType;
      requiredSkills = extracted.requiredSkills || [];
    } catch (e) {
      console.error('AI JD Analysis failed', e);
    }

    return {
      url: result.url,
      fileName: file.originalname,
      title,
      description: text,
      location,
      employmentType,
      requiredSkills,
    };
  }

  // GET /api/assess/my-jobs - Get internal jobs for current company
  async getMyJobs(companyId: string) {
    const jobs = await this.assessRepository.findMyJobs(companyId);

    // Transform to match frontend Role interface
    return jobs.map(job => {
      const candidates = job.applications.map((app: any) => ({
        id: app.candidate_id,
        firstName: app.candidate.first_name,
        lastName: app.candidate.last_name,
        email: app.candidate.email,
        status: app.status === 'NEW' ? 'invited' :
          app.status === 'IN_PROGRESS' ? 'in_progress' :
            app.status === 'COMPLETED' ? 'completed' : 'invited',
        stage: app.stage,
        completedAt: app.updated_at,
        resumeUrl: app.resume_url,
        assessmentResults: app.application_round_progress.map((progress: any) => ({
          assessmentId: progress.round_id,
          assessmentName: progress.job_round.name,
          status: progress.status === 'COMPLETED' ? 'completed' :
            progress.status === 'IN_PROGRESS' ? 'in_progress' : 'pending',
          assignedAt: progress.started_at || progress.created_at,
          completedAt: progress.completed_at,
        })),
      }));

      const assessments = job.job_round.map((round: any) => ({
        id: round.id,
        name: round.name,
        description: round.description || '',
        category: 'assessment',
      }));

      const completedCount = candidates.filter((c: any) => c.status === 'completed').length;

      return {
        id: job.id,
        position: {
          id: job.id,
          title: job.title,
          location: job.location,
          employmentType: job.employment_type.toLowerCase().replace('_', '-'),
          seniority: 'mid', // Default
          skills: job.requirements || [],
          responsibilities: (job.responsibilities || []).join('\n'),
        },
        assessments,
        candidates,
        status: completedCount === candidates.length && candidates.length > 0 ? 'completed' : 'active',
        createdAt: job.created_at,
        orderId: `ORD-${job.id.slice(0, 8).toUpperCase()}`,
      };
    });
  }

  // GET /api/assess/balance - Get company credit balance
  async getCompanyBalance(companyId: string) {
    const balance = await WalletService.getBalance('COMPANY', companyId);
    return balance;
  }

  // POST /api/assess/test-credits - Add test credits (dev only)
  async addTestCredits(companyId: string, amount: number, userId: string) {
    return WalletService.creditAccount({
      ownerType: 'COMPANY',
      ownerId: companyId,
      amount: amount,
      type: 'ADMIN_ADJUSTMENT',
      description: 'Test Credit Top-up',
      createdBy: userId
    });
  }

  // GET /api/assess/jobs/:jobId - Get job with candidates
  async getJobWithCandidates(jobId: string, companyId: string) {
    const job = await this.assessRepository.findJobWithCandidates(jobId, companyId);
    if (!job) {
      throw new HttpException(404, 'Job not found');
    }
    return job;
  }

  // POST /api/assess/jobs/:jobId/candidates - Add candidate to internal job
  async addCandidateToJob(jobId: string, candidateData: any, companyId: string, userId: string, file?: Express.Multer.File) {
    // Verify job belongs to company
    const job = await this.assessRepository.findById(jobId);
    if (!job || job.company_id !== companyId) {
      throw new HttpException(404, 'Job not found');
    }

    let resumeUrl = null;
    if (file) {
      const { uploadService } = await import('../../services/upload.service');
      const result = await uploadService.uploadFile(file, `assess/resumes/${companyId}`);
      resumeUrl = result.url;
    }

    return this.assessRepository.addCandidateToJob(jobId, {
      ...candidateData,
      resumeUrl,
      addedBy: userId
    });
  }

  // POST /api/assess/upload-cv - Upload candidate CV
  async uploadCandidateCV(file: Express.Multer.File, companyId: string) {
    if (!file) throw new HttpException(400, 'File is required');

    const { uploadService } = await import('../../services/upload.service');
    const result = await uploadService.uploadFile(file, `assess/resumes/${companyId}`);

    // Real AI Parsing
    const parsedCandidate = await ResumeParserService.parseResume(file.buffer, file.mimetype);

    return {
      url: result.url,
      fileName: file.originalname,
      firstName: parsedCandidate.firstName,
      lastName: parsedCandidate.lastName,
      email: parsedCandidate.email,
      mobile: parsedCandidate.phone,
      parsedData: parsedCandidate
    };
  }

  // POST /api/assess/jobs/:jobId/candidates/:candidateId/move - Move candidate
  async moveCandidate(applicationId: string, stage: string, companyId: string, userId: string) {
    // 1. Verify application belongs to company through job
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        job: {
          company_id: companyId,
        },
      },
    });

    if (!application) {
      throw new HttpException(404, 'Application not found');
    }

    // 2. Process Credit Deduction if moving for the first time or specific stages
    // Following old backend logic: charge for the move to assessment
    const cost = 1; // 1 credit per assessment move

    try {
      await WalletService.debitAccount({
        ownerType: 'COMPANY',
        ownerId: companyId,
        amount: cost,
        type: 'ADDON_SERVICE_CHARGE',
        description: `Assessment credit deduction for candidate movement to ${stage}`,
        referenceId: applicationId,
        referenceType: 'APPLICATION',
        createdBy: userId
      });
    } catch (error) {
      if (error instanceof HttpException && error.status === 402) {
        throw error;
      }
      // Log error but maybe don't block if it's a transient wallet issue? 
      // Actually, business-wise we should block.
      throw error;
    }

    // 3. Update application stage and status
    const stageToStatus: Record<string, any> = {
      'NEW_APPLICATION': 'NEW',
      'RESUME_REVIEW': 'SCREENING',
      'PHONE_SCREEN': 'SCREENING',
      'TECHNICAL_INTERVIEW': 'INTERVIEW',
      'OFFER_ACCEPTED': 'HIRED',
      'REJECTED': 'REJECTED',
    };

    const status = stageToStatus[stage] || 'SCREENING';

    return this.assessRepository.moveCandidate(applicationId, {
      stage,
      status
    });
  }
}

export const assessService = new AssessService();
