import { BaseService } from '../../core/service';
import { prisma } from '../../utils/prisma';
import { ConsultantRepository } from './consultant.repository';
import { ActivityType, ActorType, ApplicationStatus, JobRoundType } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';
import { HttpException } from '../../core/http-exception';
import { JobAllocationService } from '../hrm8/job-allocation.service';
import { JobAllocationRepository } from '../hrm8/job-allocation.repository';
import { generateSessionId, getSessionExpiration } from '../../utils/session';
import { SetupAccountRequest, SendMessageRequest, CandidateStatusUpdate, CandidateMoveRound, WithdrawalRequest } from './consultant.types';
import { StripeFactory } from '../stripe/stripe.factory';
import { env } from '../../config/env';
import { verifyInvitationToken } from '../../utils/invitation';

export class ConsultantService extends BaseService {
  private jobAllocationService: JobAllocationService;
  private consultantRepository: ConsultantRepository;

  constructor(consultantRepository: ConsultantRepository = new ConsultantRepository()) {
    super();
    this.consultantRepository = consultantRepository;
    this.jobAllocationService = new JobAllocationService(new JobAllocationRepository());
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
      throw new HttpException(403, 'Account is inactive');
    }

    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiration(7 * 24); // 7 days

    await this.consultantRepository.createSession({
      session_id: sessionId,
      consultant_id: consultant.id,
      email: consultant.email,
      expires_at: expiresAt
    });

    await this.consultantRepository.updateLastLogin(consultant.id);

    return { consultant, sessionId };
  }

  async logout(sessionId: string) {
    await this.consultantRepository.deleteSession(sessionId);
  }

  async getCurrentConsultant(sessionId: string) {
    const session = await this.consultantRepository.findSessionBySessionId(sessionId);

    if (!session || session.expires_at < new Date()) {
      return null;
    }

    await this.consultantRepository.updateSessionBySessionId(sessionId);
    return session.consultant;
  }

  async getProfile(consultantId: string) {
    const consultant = await this.consultantRepository.findById(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');
    return consultant;
  }

  async updateProfile(consultantId: string, data: any) {
    const allowedUpdates = {
      phone: data.phone,
      photo: data.photo,
      address: data.address,
      city: data.city,
      state_province: data.state_province ?? data.stateProvince,
      country: data.country,
      languages: data.languages,
      industry_expertise: data.industry_expertise ?? data.industryExpertise,
      resume_url: data.resume_url ?? data.resumeUrl,
      linkedin_url: data.linkedin_url ?? data.linkedinUrl,
      payment_method: data.payment_method ?? data.paymentMethod,
      tax_information: data.tax_information ?? data.taxInformation,
      availability: data.availability
    };

    const updateData = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, v]) => v !== undefined)
    );

    return this.consultantRepository.update(consultantId, updateData);
  }

  async getAssignedJobs(consultantId: string, filters?: { status?: string }) {
    const where: any = {
      consultant_id: consultantId,
      status: 'ACTIVE'
    };
    if (filters?.status) where.job = { status: filters.status };

    const assignments = await prisma.consultantJobAssignment.findMany({
      where,
      include: {
        job: {
          include: {
            company: { select: { id: true, name: true } }
          }
        }
      }
    });

    return assignments.map(a => ({
      ...a.job,
      pipeline: {
        stage: a.pipeline_stage,
        progress: a.pipeline_progress,
        note: a.pipeline_note,
        updatedAt: a.pipeline_updated_at
      }
    }));
  }

  async getJobDetails(consultantId: string, jobId: string) {
    let cleanJobId = jobId;
    if (jobId.includes(' ') && !jobId.includes('-') && jobId.length === 36) {
      cleanJobId = jobId.replace(/\s/g, '-');
    } else if (jobId.length > 36 && jobId.includes('%20')) {
      cleanJobId = decodeURIComponent(jobId);
    }

    const assignment = await prisma.consultantJobAssignment.findFirst({
      where: { consultant_id: consultantId, job_id: cleanJobId, status: 'ACTIVE' }
    });

    if (!assignment) {
      throw new HttpException(403, 'Consultant is not assigned to this job');
    }

    const job = await prisma.job.findUnique({
      where: { id: cleanJobId },
      include: {
        company: { select: { id: true, name: true, domain: true } },
        assigned_consultant: { select: { id: true, first_name: true, last_name: true } }
      }
    });

    if (!job) throw new HttpException(404, 'Job not found');

    const teamAssignments = await prisma.consultantJobAssignment.findMany({
      where: { job_id: cleanJobId, status: 'ACTIVE', consultant_id: { not: consultantId } },
      include: {
        consultant: { select: { id: true, first_name: true, last_name: true, email: true } }
      }
    });

    return {
      job,
      pipeline: {
        stage: assignment.pipeline_stage,
        progress: assignment.pipeline_progress,
        note: assignment.pipeline_note,
        updatedAt: assignment.pipeline_updated_at
      },
      team: teamAssignments.map(t => t.consultant),
      employer: {
        contactName: 'Confidential',
        email: 'confidential@employer.com'
      }
    };
  }

  async updateJobPipeline(consultantId: string, jobId: string, data: { stage?: string; note?: string }) {
    return this.jobAllocationService.updatePipelineForConsultantJob(consultantId, jobId, {
      ...data,
      updatedBy: consultantId
    });
  }

  async submitShortlist(consultantId: string, jobId: string, candidateIds: string[], notes?: string) {
    await this.getJobDetails(consultantId, jobId);

    for (const appId of candidateIds) {
      const app = await this.consultantRepository.findApplicationById(appId);
      if (app && app.job_id === jobId) {
        await this.consultantRepository.updateApplication(appId, {
          shortlisted: true,
          shortlisted_at: new Date(),
          shortlisted_by: consultantId,
          recruiter_notes: notes ? `${app.recruiter_notes || ''}\n[Shortlist Note]: ${notes}` : app.recruiter_notes
        });
      }
    }

    await this.updateJobPipeline(consultantId, jobId, {
      stage: 'SHORTLIST_SENT',
      note: `Shortlist submitted: ${candidateIds.length} candidates. Notes: ${notes || 'None'}`
    });

    await this.logJobActivity(consultantId, jobId, 'SHORTLIST_SUBMITTED', `Submitted ${candidateIds.length} candidates.`);

    return { submitted: candidateIds.length };
  }

  async flagJob(consultantId: string, jobId: string, issueType: string, description: string, severity: string) {
    const assignment = await this.consultantRepository.findJobAssignment(consultantId, jobId);
    if (!assignment) throw new HttpException(403, 'Not assigned to this job');

    if (!assignment.job) throw new HttpException(404, 'Job not found for assignment');

    await this.consultantRepository.createActivity({
      company: { connect: { id: assignment.job.company_id } },
      type: ActivityType.TASK,
      subject: `Flagged Job: ${issueType} - ${severity}`,
      description: `Description: ${description}\nJob ID: ${jobId}\nLogged by consultant`,
      created_by: consultantId,
      actor_type: ActorType.CONSULTANT,
      tags: ['JOB_FLAG', severity, issueType]
    });

    return true;
  }

  async logJobActivity(consultantId: string, jobId: string, activityType: string, notes: string) {
    const assignment = await this.consultantRepository.findJobAssignment(consultantId, jobId);
    if (!assignment) throw new HttpException(403, 'Not assigned to this job');

    if (!assignment.job) throw new HttpException(404, 'Job not found for assignment');

    await this.consultantRepository.createActivity({
      company: { connect: { id: assignment.job.company_id } },
      type: ActivityType.NOTE,
      subject: `Job Activity: ${activityType}`,
      description: `Notes: ${notes}\nJob ID: ${jobId}`,
      created_by: consultantId,
      actor_type: ActorType.CONSULTANT,
      tags: ['JOB_ACTIVITY', activityType]
    });

    return true;
  }

  async getCommissions(consultantId: string, filters?: any) {
    return this.consultantRepository.findCommissions(consultantId, filters);
  }

  async getPerformanceMetrics(consultantId: string) {
    const consultant = await prisma.consultant.findUnique({
      where: { id: consultantId }
    });
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    return {
      totalPlacements: consultant.total_placements,
      totalRevenue: consultant.total_revenue,
      successRate: consultant.success_rate,
      averageDaysToFill: consultant.average_days_to_fill,
      pendingCommissions: consultant.pending_commissions,
      totalCommissionsPaid: consultant.total_commissions_paid
    };
  }

  async getDashboardAnalytics(consultantId: string) {
    const performance = await this.getPerformanceMetrics(consultantId);

    const assignments = await prisma.consultantJobAssignment.findMany({
      where: { consultant_id: consultantId, status: 'ACTIVE' },
      take: 5,
      orderBy: { assigned_at: 'desc' },
      include: {
        job: {
          include: {
            company: { select: { id: true, name: true } },
            applications: {
              where: { status: { notIn: ['REJECTED', 'WITHDRAWN'] } },
              select: { id: true, status: true }
            }
          }
        }
      }
    });

    const activeJobs = assignments.map(a => ({
      id: a.job.id,
      title: a.job.title,
      company: a.job.company?.name || 'Unknown Company',
      location: 'Remote',
      postedAt: a.job.created_at,
      assignedAt: a.assigned_at,
      activeCandidates: a.job.applications.length
    }));

    const allAssignments = await prisma.consultantJobAssignment.findMany({
      where: { consultant_id: consultantId, status: 'ACTIVE' },
      select: { job_id: true }
    });

    const jobIds = allAssignments.map(a => a.job_id);

    const pipelineGroups = await prisma.application.groupBy({
      by: ['stage'],
      where: {
        job_id: { in: jobIds },
        status: { notIn: ['REJECTED', 'WITHDRAWN'] }
      },
      _count: true
    });

    const pipeline = pipelineGroups.map(g => ({
      stage: g.stage,
      count: g._count
    }));

    const recentCommissionsRaw = await prisma.commission.findMany({
      where: { consultant_id: consultantId },
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        job: { select: { title: true } }
      }
    });

    const recentCommissions = recentCommissionsRaw.map(c => ({
      id: c.id,
      amount: Number(c.amount),
      status: c.status,
      description: c.description || 'Commission payment',
      date: c.created_at,
      jobTitle: c.job?.title
    }));

    const commissions = await prisma.commission.findMany({
      where: { consultant_id: consultantId },
      select: { amount: true, status: true, created_at: true }
    });

    const totalRevenue = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const paidRevenue = commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + Number(c.amount), 0);
    const pendingRevenue = commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + Number(c.amount), 0);

    const currentMonthDate = new Date();
    const currentMonthRevenue = commissions
      .filter(c => {
        const d = new Date(c.created_at);
        return d.getMonth() === currentMonthDate.getMonth() && d.getFullYear() === currentMonthDate.getFullYear();
      })
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const totalJobs = await prisma.consultantJobAssignment.count({ where: { consultant_id: consultantId } });
    const successfulPlacements = performance.totalPlacements;
    const successRate = totalJobs > 0 ? Math.round((successfulPlacements / totalJobs) * 100) : 0;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trends = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthIdx = d.getMonth();
      const year = d.getFullYear();

      const monthlyComms = commissions.filter(c => {
        const cd = new Date(c.created_at);
        return cd.getMonth() === monthIdx && cd.getFullYear() === year;
      });

      trends.push({
        name: months[monthIdx],
        revenue: monthlyComms.reduce((sum, c) => sum + Number(c.amount), 0),
        placements: 0,
        paid: monthlyComms.filter(c => c.status === 'PAID').reduce((sum, c) => sum + Number(c.amount), 0),
        pending: monthlyComms.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + Number(c.amount), 0)
      });
    }

    return {
      ...performance,
      successRate,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      currentMonthRevenue,
      activeJobs,
      pipeline,
      recentCommissions,
      trends,
      targets: {
        monthlyRevenue: 10000,
        monthlyPlacements: 5
      }
    };
  }

  async setupAccount(data: SetupAccountRequest) {
    if (!data.token) throw new HttpException(400, 'Token required');
    const decoded = verifyInvitationToken(data.token);
    if (!decoded?.consultantId) throw new HttpException(400, 'Invalid or expired token');

    const consultant = await this.consultantRepository.findById(decoded.consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    const passwordHash = await hashPassword(data.password);

    return this.consultantRepository.update(consultant.id, {
      password_hash: passwordHash,
      first_name: data.firstName,
      last_name: data.lastName,
      status: 'ACTIVE'
    });
  }

  async listConversations(consultantId: string, page = 1) {
    return this.consultantRepository.findConversations(consultantId, page);
  }

  async getMessages(consultantId: string, conversationId: string) {
    const conversation = await this.consultantRepository.findConversationById(conversationId, consultantId);
    if (!conversation) throw new HttpException(404, 'Conversation not found');
    return conversation;
  }

  async sendMessage(consultantId: string, conversationId: string, data: SendMessageRequest) {
    const conversation = await this.consultantRepository.findConversationById(conversationId, consultantId);
    if (!conversation) throw new HttpException(404, 'Conversation not found');

    return this.consultantRepository.createMessage({
      conversation: { connect: { id: conversationId } },
      sender_id: consultantId,
      sender_type: 'CONSULTANT',
      sender_email: 'consultant@example.com',
      content: data.content,
      content_type: (data.type as any) || 'TEXT',
      attachments: { create: data.attachments }
    });
  }

  async markMessageRead(consultantId: string, conversationId: string) {
    return this.consultantRepository.markMessagesRead(conversationId, consultantId);
  }

  async getJobCandidates(consultantId: string, jobId: string) {
    await this.getJobDetails(consultantId, jobId);
    return this.consultantRepository.findJobCandidates(jobId);
  }

  async getJobRounds(consultantId: string, jobId: string) {
    await this.getJobDetails(consultantId, jobId);
    return this.consultantRepository.findJobRounds(jobId);
  }

  async updateCandidateStatus(consultantId: string, applicationId: string, update: CandidateStatusUpdate) {
    const app = await this.consultantRepository.findApplicationById(applicationId);
    if (!app) throw new HttpException(404, 'Application not found');

    await this.getJobDetails(consultantId, app.job_id);

    return this.consultantRepository.updateApplication(applicationId, {
      status: update.status as any
    });
  }

  async addCandidateNote(consultantId: string, applicationId: string, note: string) {
    const app = await this.consultantRepository.findApplicationById(applicationId);
    if (!app) throw new HttpException(404, 'Application not found');
    await this.getJobDetails(consultantId, app.job_id);

    const currentNotes = app.recruiter_notes || '';
    const newNotes = `${currentNotes}\n[Consultant]: ${note}`;

    return this.consultantRepository.updateApplication(applicationId, {
      recruiter_notes: newNotes
    });
  }

  async moveCandidateToRound(consultantId: string, applicationId: string, move: CandidateMoveRound) {
    const app = await this.consultantRepository.findApplicationById(applicationId);
    if (!app) throw new HttpException(404, 'Application not found');
    await this.getJobDetails(consultantId, app.job_id);

    const rounds = await this.consultantRepository.findJobRounds(app.job_id);
    const targetRound = rounds.find(r => r.id === move.jobRoundId);
    if (!targetRound) throw new HttpException(400, 'Invalid round for this job');

    const existingProgress = await this.consultantRepository.findRoundProgress(applicationId, move.jobRoundId);
    if (!existingProgress) {
      await this.consultantRepository.createRoundProgress({
        applicationId,
        jobRoundId: move.jobRoundId,
        completed: false
      });
    }

    let newStatus: ApplicationStatus | undefined;
    if (targetRound.type === JobRoundType.INTERVIEW) {
      newStatus = ApplicationStatus.INTERVIEW;
    } else if (targetRound.type === JobRoundType.ASSESSMENT) {
      newStatus = ApplicationStatus.SCREENING;
    }

    await this.consultantRepository.updateApplication(applicationId, {
      status: newStatus,
      updated_at: new Date()
    });

    if (move.notes) {
      await this.addCandidateNote(consultantId, applicationId, `Moved to ${targetRound.name}: ${move.notes}`);
    }

    return { success: true, message: `Moved candidate to ${targetRound.name}` };
  }

  async updateCandidateStage(consultantId: string, applicationId: string, stage: string) {
    const app = await this.consultantRepository.findApplicationById(applicationId);
    if (!app) throw new HttpException(404, 'Application not found');
    await this.getJobDetails(consultantId, app.job_id);

    return this.consultantRepository.updateApplication(applicationId, {
      stage: stage as any
    });
  }

  async getWalletBalance(consultantId: string) {
    const stats = await this.consultantRepository.findCommissionStats(consultantId);

    const availableCommissions = await this.consultantRepository.findAvailableCommissionsForWithdrawal(consultantId);
    const availableBalance = availableCommissions.reduce((sum, c) => sum + c.amount, 0);

    const withdrawals = await this.consultantRepository.findWithdrawals(consultantId);
    const totalWithdrawn = withdrawals
      .filter(w => w.status === 'COMPLETED')
      .reduce((sum, w) => sum + w.amount, 0);

    return {
      available: Math.round(availableBalance * 100) / 100,
      pending: Math.round(stats.pending * 100) / 100,
      totalEarned: Math.round(stats.totalEarned * 100) / 100,
      totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
      currency: 'USD'
    };
  }

  async requestWithdrawal(consultantId: string, data: WithdrawalRequest) {
    const balance = await this.getWalletBalance(consultantId);
    if (balance.available < data.amount) {
      throw new HttpException(400, `Insufficient funds. Available: ${balance.available}`);
    }

    if (data.amount <= 0) {
      throw new HttpException(400, 'Withdrawal amount must be greater than zero');
    }

    let commissionIds = data.commissionIds || [];
    if (commissionIds.length === 0) {
      const available = await this.consultantRepository.findAvailableCommissionsForWithdrawal(consultantId);
      let currentTotal = 0;
      for (const comm of available) {
        commissionIds.push(comm.id);
        currentTotal += comm.amount;
        if (currentTotal >= data.amount) break;
      }

      if (currentTotal < data.amount) {
        throw new HttpException(400, 'Selected commissions total is less than requested amount');
      }
    }

    return this.consultantRepository.createWithdrawal({
      amount: data.amount,
      payment_method: data.paymentMethod,
      consultant: { connect: { id: consultantId } },
      status: 'PENDING',
      notes: data.description,
      commission_ids: commissionIds
    });
  }

  async getWithdrawals(consultantId: string) {
    return this.consultantRepository.findWithdrawals(consultantId);
  }

  async cancelWithdrawal(consultantId: string, withdrawalId: string) {
    const withdrawal = await this.consultantRepository.findWithdrawalById(withdrawalId, consultantId);
    if (!withdrawal) throw new HttpException(404, 'Withdrawal not found');
    if (withdrawal.status !== 'PENDING') throw new HttpException(400, 'Only pending withdrawals can be cancelled');

    return this.consultantRepository.updateWithdrawal(withdrawalId, {
      status: 'CANCELLED',
      updated_at: new Date()
    });
  }

  async executeWithdrawal(consultantId: string, withdrawalId: string) {
    const withdrawal = await this.consultantRepository.findWithdrawalById(withdrawalId, consultantId);
    if (!withdrawal) throw new HttpException(404, 'Withdrawal not found');

    const consultant = await this.consultantRepository.findById(consultantId);
    if (!consultant?.stripe_account_id || !consultant.payout_enabled) {
      throw new HttpException(400, 'Stripe account not connected or payouts not enabled');
    }

    if (withdrawal.status === 'COMPLETED') {
      throw new HttpException(400, 'Withdrawal already completed');
    }

    const transferId = `tr_mock_${Date.now()}`;
    await this.consultantRepository.updateWithdrawal(withdrawalId, {
      status: 'COMPLETED',
      payment_reference: transferId,
      processed_at: new Date(),
      updated_at: new Date()
    });

    if (withdrawal.commission_ids && withdrawal.commission_ids.length > 0) {
      await this.consultantRepository.updateCommissionsStatus(withdrawal.commission_ids as string[], 'PAID', transferId);
    }

    return { success: true, transferId };
  }

  async onboardStripe(consultantId: string) {
    const consultant = await this.consultantRepository.findById(consultantId);
    if (!consultant) throw new HttpException(404, 'Consultant not found');

    const stripe = StripeFactory.getClient();
    let stripeAccountId = consultant.stripe_account_id;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: consultant.email,
        capabilities: {
          transfers: { requested: true }
        }
      });
      stripeAccountId = account.id;
      await this.consultantRepository.update(consultantId, {
        stripe_account_id: stripeAccountId,
        stripe_account_status: 'PENDING'
      });
    }

    const returnUrl = `${env.FRONTEND_URL || 'http://localhost:8080'}/consultant/settings?stripe_success=true`;
    const refreshUrl = `${env.FRONTEND_URL || 'http://localhost:8080'}/consultant/settings?stripe_refresh=true`;

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });

    return { url: accountLink.url };
  }

  async getStripeStatus(consultantId: string) {
    const consultant = await this.consultantRepository.findById(consultantId);
    if (!consultant || !consultant.stripe_account_id) {
      return { onboarded: false, status: 'NOT_CONNECTED' };
    }

    const stripe = StripeFactory.getClient();
    const account = await stripe.accounts.retrieve(consultant.stripe_account_id);

    const onboarded = account.details_submitted;
    const status = onboarded ? 'ACTIVE' : 'PENDING';

    if (consultant.stripe_account_status !== status) {
      await this.consultantRepository.update(consultantId, {
        stripe_account_status: status,
        payout_enabled: account.payouts_enabled
      });
    }

    return {
      onboarded,
      status,
      payoutsEnabled: account.payouts_enabled
    };
  }

  async getStripeDashboard(consultantId: string) {
    const consultant = await this.consultantRepository.findById(consultantId);
    if (!consultant || !consultant.stripe_account_id) {
      throw new HttpException(400, 'Stripe account not connected');
    }

    const stripe = StripeFactory.getClient();
    const loginLink = await stripe.accounts.createLoginLink(consultant.stripe_account_id);
    return { url: loginLink.url };
  }

  async getStripeLoginLink(consultantId: string) {
    return this.getStripeDashboard(consultantId);
  }

  async getCommissionStats(consultantId: string) {
    return this.consultantRepository.findCommissionStats(consultantId);
  }

  async getCommissionDetails(consultantId: string, id: string) {
    const comm = await this.consultantRepository.findCommissionById(id, consultantId);
    if (!comm) throw new HttpException(404, 'Commission not found');
    return comm;
  }
}

export const consultantService = new ConsultantService(new ConsultantRepository());
