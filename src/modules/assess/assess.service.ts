import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';

export class AssessService extends BaseService {
  // POST /api/assess/register - Register for assess platform
  // NOTE: AssessUser model needs to be added to Prisma schema
  async registerAssessUser(data: {
    email: string;
    name: string;
    phone?: string;
    skills?: string[];
    experience?: number;
  }) {
    // Stub: Return mock user until AssessUser model is added
    return {
      id: 'assess_' + Date.now(),
      email: data.email,
      name: data.name,
      phone: data.phone,
      skills: data.skills || [],
      experience_years: data.experience || 0,
      created_at: new Date(),
    };
  }

  // GET /api/assess/me - Get current assess user
  async getAssessUser(userId: string) {
    // Stub: Return mock user data
    return {
      id: userId,
      email: 'user@example.com',
      name: 'Test User',
      skills: [],
      experience_years: 0,
      applications: [],
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
  async createInternalJob(data: {
    title: string;
    description: string;
    location?: string;
    employmentType?: string;
    categoryId?: string;
    requiredSkills?: string[];
    companyId: string;
  }) {
    const job = await this.prisma.job.create({
      data: {
        title: data.title,
        description: data.description,
        location: data.location || 'Remote',
        employment_type: data.employmentType as any || 'FULL_TIME',
        company_id: data.companyId,
        status: 'OPEN',
        created_by: data.companyId, // Required field
      },
    });

    return job;
  }
}

export const assessService = new AssessService();
