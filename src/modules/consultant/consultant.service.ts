import { BaseService } from '../../core/service';
import { ConsultantRepository } from './consultant.repository';
import { Consultant, Job } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';
import { HttpException } from '../../core/http-exception';
import { generateSessionId, getSessionExpiration } from '../../utils/session';

export class ConsultantService extends BaseService {
  constructor(private consultantRepository: ConsultantRepository) {
    super();
  }

  async login(data: { email: string; password: string }) {
    const consultant = await this.consultantRepository.findByEmail(normalizeEmail(data.email));
    
    if (!consultant) {
      throw new HttpException(401, 'Invalid credentials');
    }

    const isValid = await comparePassword(data.password, consultant.password_hash);
    if (!isValid) {
      throw new HttpException(401, 'Invalid credentials');
    }

    if (consultant.status !== 'ACTIVE') {
      throw new HttpException(403, `Account status: ${consultant.status}`);
    }

    // Update last login
    await this.consultantRepository.updateLastLogin(consultant.id);

    // Create session
    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiration();

    await this.consultantRepository.createSession({
      session_id: sessionId,
      consultant: { connect: { id: consultant.id } },
      email: consultant.email,
      expires_at: expiresAt,
    });

    return { consultant, sessionId };
  }

  async logout(sessionId: string) {
    await this.consultantRepository.deleteSession(sessionId);
  }

  async getProfile(id: string) {
    const consultant = await this.consultantRepository.findById(id);
    if (!consultant) throw new HttpException(404, 'Consultant not found');
    return consultant;
  }

  async updateProfile(id: string, data: any) {
    // Prevent updating sensitive fields
    delete data.password_hash;
    delete data.email;
    delete data.role;
    
    return this.consultantRepository.update(id, data);
  }

  // Jobs
  async getAssignedJobs(consultantId: string, filters: any) {
    const assignments = await this.consultantRepository.findAssignedJobs(consultantId, filters);
    // Flatten structure to return jobs with assignment details if needed
    // or just return as is
    return assignments.map(a => ({
      ...a.job,
      assignmentStatus: a.status,
      assignedAt: a.assigned_at
    }));
  }

  async getJobDetails(consultantId: string, jobId: string) {
    const assignment = await this.consultantRepository.findJobAssignment(consultantId, jobId);
    if (!assignment) throw new HttpException(404, 'Job assignment not found');
    
    // Here we might want to fetch full job details from JobRepository
    // For now, let's assume we fetch basic details via assignment relation if we included it
    // But since we didn't include it in findJobAssignment, we might need a separate fetch or include
    // Let's rely on frontend fetching job details if assignment exists
    return assignment; 
  }

  async submitShortlist(consultantId: string, jobId: string, candidateIds: string[], notes?: string) {
    // Verify assignment
    const assignment = await this.consultantRepository.findJobAssignment(consultantId, jobId);
    if (!assignment) throw new HttpException(403, 'Not assigned to this job');

    // Logic to update job pipeline or create candidate-job applications
    // This likely involves CandidateJobService or similar
    // Placeholder logic:
    console.log(`Submitting shortlist for job ${jobId} by consultant ${consultantId}`, candidateIds);
    return true;
  }

  async flagJob(consultantId: string, jobId: string, issueType: string, description: string, severity: string) {
     // Verify assignment
    const assignment = await this.consultantRepository.findJobAssignment(consultantId, jobId);
    if (!assignment) throw new HttpException(403, 'Not assigned to this job');

    // Create Issue/Flag record
    // Placeholder
    console.log(`Flagging job ${jobId}`, { issueType, description, severity });
    return true;
  }

  async logJobActivity(consultantId: string, jobId: string, activityType: string, notes: string) {
    // Verify assignment
    const assignment = await this.consultantRepository.findJobAssignment(consultantId, jobId);
    if (!assignment) throw new HttpException(403, 'Not assigned to this job');

    // Log activity
    // Placeholder
    console.log(`Logging activity for job ${jobId}`, { activityType, notes });
    return true;
  }

  // Commissions
  async getCommissions(consultantId: string, filters: any) {
    return this.consultantRepository.findCommissions(consultantId, filters);
  }

  // Performance
  async getPerformanceMetrics(consultantId: string) {
    const consultant = await this.consultantRepository.findById(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    return {
      totalPlacements: consultant.total_placements,
      totalRevenue: consultant.total_revenue,
      successRate: consultant.success_rate,
      avgDaysToFill: consultant.average_days_to_fill,
      currentActiveJobs: consultant.current_jobs
    };
  }
}
