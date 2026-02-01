import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';

export class CandidateJobService extends BaseService {

  async listJobs(skip: number, take: number) {
    return prisma.job.findMany({
      where: { status: 'OPEN' },
      select: {
        id: true,
        title: true,
        company: { select: { name: true } },
        location: true,
        employment_type: true,
        salary_min: true,
        salary_max: true,
        job_summary: true,
        posting_date: true
      },
      skip,
      take,
      orderBy: { posting_date: 'desc' }
    });
  }

  async getJobDetails(jobId: string) {
    return prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: { select: { name: true } },
        job_round: { select: { id: true, name: true } }
      }
    });
  }

  async applyToJob(candidateId: string, jobId: string, data: any) {
    // Check if already applied
    const existing = await prisma.application.findFirst({
      where: { candidate_id: candidateId, job_id: jobId }
    });

    if (existing) {
      throw new HttpException(400, 'Already applied to this job');
    }

    // Create application
    return prisma.application.create({
      data: {
        candidate_id: candidateId,
        job_id: jobId,
        status: 'NEW',
        stage: 'NEW_APPLICATION',
        resume_url: data.resume_url,
        cover_letter_url: data.cover_letter_url,
        custom_answers: data.custom_answers || {},
        is_new: true,
        is_read: false
      }
    });
  }

  async saveJob(candidateId: string, jobId: string) {
    // Check if job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new HttpException(404, 'Job not found');
    }

    // Upsert saved job
    return prisma.savedJob.upsert({
      where: {
        candidate_id_job_id: {
          candidate_id: candidateId,
          job_id: jobId
        }
      },
      update: {},
      create: {
        candidate_id: candidateId,
        job_id: jobId
      }
    });
  }

  async searchJobs(query: string, location: string, employmentType: string, skip: number, take: number) {
    return prisma.job.findMany({
      where: {
        status: 'OPEN',
        ...(query && {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        }),
        ...(location && { location: { contains: location, mode: 'insensitive' } }),
        ...(employmentType && { employment_type: employmentType as any })
      },
      select: {
        id: true,
        title: true,
        company: { select: { name: true } },
        location: true,
        employment_type: true,
        salary_min: true,
        salary_max: true,
        job_summary: true
      },
      skip,
      take,
      orderBy: { posting_date: 'desc' }
    });
  }

  async getRecommendedJobs(candidateId: string, limit: number) {
    // 1. Fetch candidate profile with skills, experience and preferences
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        skills: { select: { name: true } },
        work_experience: { select: { role: true } }
      }
    });

    if (!candidate) {
      throw new HttpException(404, 'Candidate not found');
    }

    const candidateSkills = candidate.skills.map((s: any) => s.name.toLowerCase());
    const pastTitles = candidate.work_experience.map((exp: any) => exp.role.toLowerCase());

    // 2. Fetch recent OPEN jobs
    const jobs = await prisma.job.findMany({
      where: {
        status: 'OPEN',
        archived: false,
        visibility: 'public'
      },
      include: {
        company: { select: { name: true } }
      },
      orderBy: { posting_date: 'desc' },
      take: 100 //Detailed scoring on recent 100 jobs
    });

    // 3. Score each job
    const scoredJobs = jobs.map(job => {
      let score = 0;
      const reasons: string[] = [];
      const jobText = `${job.title} ${job.job_summary || ''} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();

      // Skill Matching (Weight: 50pts max)
      if (candidateSkills.length > 0) {
        let matches = 0;
        candidateSkills.forEach((skill: string) => {
          if (jobText.includes(skill)) {
            matches += 1;
          }
        });
        if (matches > 0) {
          const points = Math.min(matches * 10, 50);
          score += points;
          reasons.push(`${matches} matching skills`);
        }
      }

      // Location Matching (Weight: 20pts)
      const isRemoteJob = job.work_arrangement === 'REMOTE' || job.location.toLowerCase().includes('remote');
      const candidateWantsRemote = candidate.remote_preference === 'REMOTE_ONLY' || candidate.remote_preference === 'HYBRID';

      if (isRemoteJob && candidateWantsRemote) {
        score += 20;
        reasons.push('Matches remote preference');
      } else if (candidate.city && job.location.toLowerCase().includes(candidate.city.toLowerCase())) {
        score += 20;
        reasons.push(`Located in ${candidate.city}`);
      }

      // Job Type Matching (Weight: 15pts)
      if (candidate.job_type_preference && candidate.job_type_preference.length > 0) {
        if (candidate.job_type_preference.includes(job.employment_type)) {
          score += 15;
          reasons.push('Matches job type preference');
        }
      }

      // Title/Experience Matching (Weight: 20pts)
      const hasTitleMatch = pastTitles.some(title => {
        const words = title.split(' ');
        return words.some((word: string) => word.length > 3 && job.title.toLowerCase().includes(word));
      });

      if (hasTitleMatch) {
        score += 20;
        reasons.push('Matches your experience');
      }

      // Salary Matching (Weight: 10pts)
      if (candidate.salary_preference) {
        const pref = candidate.salary_preference as any;
        if (pref.min && job.salary_max && job.salary_max >= pref.min) {
          score += 10;
          reasons.push('Matches salary preference');
        }
      }

      // Holistic Percentage (Cap at 100)
      const finalPercentage = Math.min(score, 100);

      return {
        ...job,
        matchScore: finalPercentage,
        matchReasons: reasons
      };
    });

    // 4. Sort and return top recommendations
    return scoredJobs
      .filter(job => job.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  async processJobAlerts(job: any): Promise<void> {
    // TODO: Implement job alert processing
  }
}

export const candidateJobService = new CandidateJobService();
