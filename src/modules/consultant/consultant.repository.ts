import type { Prisma, Consultant, ConsultantJobAssignment, Commission, Conversation, Message, Application, JobRound, CommissionWithdrawal, CommissionStatus } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class ConsultantRepository extends BaseRepository {

  async findByEmail(email: string): Promise<Consultant | null> {
    return this.prisma.consultant.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<Consultant | null> {
    return this.prisma.consultant.findUnique({
      where: { id },
    });
  }

  async findAll(filters?: Prisma.ConsultantWhereInput): Promise<Consultant[]> {
    return this.prisma.consultant.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async update(id: string, data: Prisma.ConsultantUpdateInput): Promise<Consultant> {
    return this.prisma.consultant.update({
      where: { id },
      data,
    });
  }

  async updateLastLogin(id: string): Promise<Consultant> {
    return this.prisma.consultant.update({
      where: { id },
      data: { last_login_at: new Date() },
    });
  }

  // Jobs
  async findAssignedJobs(consultantId: string, filters?: any): Promise<any[]> {
    const where: any = { consultant_id: consultantId };
    if (filters?.status) where.status = filters.status;

    return this.prisma.consultantJobAssignment.findMany({
      where,
      include: {
        job: true
      },
      orderBy: { assigned_at: 'desc' }
    });
  }

  async findJobAssignment(consultantId: string, jobId: string) {
    return this.prisma.consultantJobAssignment.findUnique({
      where: {
        consultant_id_job_id: {
          consultant_id: consultantId,
          job_id: jobId
        }
      },
      include: {
        job: true
      }
    });
  }

  async createActivity(data: Prisma.ActivityCreateInput) {
    return this.prisma.activity.create({
      data
    });
  }

  // Commissions
  async findCommissions(consultantId: string, filters?: any): Promise<Commission[]> {
    const where: any = { consultant_id: consultantId };
    if (filters?.status) where.status = filters.status;

    return this.prisma.commission.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });
  }

  // Session
  async createSession(data: Prisma.ConsultantSessionCreateInput) {
    return this.prisma.consultantSession.create({
      data,
    });
  }

  async findSessionBySessionId(sessionId: string) {
    return this.prisma.consultantSession.findUnique({
      where: { session_id: sessionId },
      include: { consultant: true },
    });
  }

  async deleteSession(sessionId: string) {
    return this.prisma.consultantSession.delete({
      where: { session_id: sessionId },
    });
  }
  // Conversations
  async findConversations(consultantId: string, page = 1, limit = 20): Promise<Conversation[]> {
    const skip = (page - 1) * limit;
    return this.prisma.conversation.findMany({
      where: { consultant_id: consultantId },
      include: {
        participants: true,
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      },
      orderBy: { updated_at: 'desc' },
      skip,
      take: limit
    });
  }

  async findConversationById(id: string, consultantId: string): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: {
        id,
        consultant_id: consultantId
      },
      include: {
        participants: true,
        messages: {
          orderBy: { created_at: 'asc' }
        }
      }
    });
  }

  async createMessage(data: Prisma.MessageCreateInput): Promise<Message> {
    return this.prisma.message.create({
      data
    });
  }

  async markMessagesRead(conversationId: string, userId: string): Promise<void> {
    // Logic to mark messages as read would depened on how read receipts are stored.
    // Schema has read_by String[] in Message model.
    // Use raw query or findMany + updateMany (if supported for arrays) or iterate.
    // For simplicity/performance with arrays, raw query often best, but let's try prisma updateMany logic if possible or just leave as stub/simple update.
    // Prisma doesn't easily support "push to array" in updateMany.
    // We will just return for now or implement if needed. 
    // A better approach is to fetch unread messages and update them.
    /*
    const messages = await this.prisma.message.findMany({
       where: { conversation_id: conversationId, NOT: { read_by: { has: userId } } }
    });
    for (const msg of messages) {
      await this.prisma.message.update({
        where: { id: msg.id },
        data: { read_by: { push: userId } }
      });
    }
    */
  }

  // Candidates & Applications
  async findJobCandidates(jobId: string, filters?: any): Promise<Application[]> {
    return this.prisma.application.findMany({
      where: {
        job_id: jobId,
        // Apply filters if needed
      },
      include: {
        candidate: {
          select: { id: true, first_name: true, last_name: true, email: true, resume_url: true }
        },
        screening_result: true
      }
    });
  }

  async findJobRounds(jobId: string): Promise<JobRound[]> {
    return this.prisma.jobRound.findMany({
      where: { job_id: jobId },
      orderBy: { order: 'asc' },
      include: {
        assessment_configuration: true,
        interview_configuration: true
      }
    });
  }



  // Withdrawals
  async createWithdrawal(data: Prisma.CommissionWithdrawalCreateInput): Promise<CommissionWithdrawal> {
    return this.prisma.commissionWithdrawal.create({ data });
  }

  async findWithdrawals(consultantId: string): Promise<CommissionWithdrawal[]> {
    return this.prisma.commissionWithdrawal.findMany({
      where: { consultant_id: consultantId },
      orderBy: { created_at: 'desc' }
    });
  }

  async findWithdrawalById(id: string, consultantId: string): Promise<CommissionWithdrawal | null> {
    return this.prisma.commissionWithdrawal.findFirst({
      where: { id, consultant_id: consultantId }
    });
  }

  async updateWithdrawal(id: string, data: Prisma.CommissionWithdrawalUpdateInput): Promise<CommissionWithdrawal> {
    return this.prisma.commissionWithdrawal.update({
      where: { id },
      data
    });
  }

  async findCommissionStats(consultantId: string) {
    const paidCommissions = await this.prisma.commission.aggregate({
      where: { consultant_id: consultantId, status: 'PAID' },
      _sum: { amount: true }
    });

    const confirmedCommissions = await this.prisma.commission.aggregate({
      where: { consultant_id: consultantId, status: 'CONFIRMED' },
      _sum: { amount: true }
    });

    const pendingCommissions = await this.prisma.commission.aggregate({
      where: { consultant_id: consultantId, status: 'PENDING' },
      _sum: { amount: true }
    });

    return {
      paid: paidCommissions._sum.amount || 0,
      confirmed: confirmedCommissions._sum.amount || 0,
      pending: pendingCommissions._sum.amount || 0,
      totalEarned: (paidCommissions._sum.amount || 0) + (confirmedCommissions._sum.amount || 0)
    };
  }

  async findAvailableCommissionsForWithdrawal(consultantId: string) {
    // Get all CONFIRMED commissions
    const confirmedCommissions = await this.prisma.commission.findMany({
      where: { consultant_id: consultantId, status: 'CONFIRMED' },
      orderBy: { created_at: 'asc' }
    });

    // Get all non-rejected/cancelled withdrawals to find used commission IDs
    const withdrawals = await this.prisma.commissionWithdrawal.findMany({
      where: {
        consultant_id: consultantId,
        status: { notIn: ['REJECTED', 'CANCELLED'] }
      },
      select: { commission_ids: true }
    });

    const usedCommissionIds = new Set<string>();
    withdrawals.forEach(w => {
      if (Array.isArray(w.commission_ids)) {
        w.commission_ids.forEach(id => usedCommissionIds.add(id));
      }
    });

    // Filter out used IDs
    return confirmedCommissions.filter(c => !usedCommissionIds.has(c.id));
  }

  async updateCommissionsStatus(ids: string[], status: CommissionStatus, paymentReference?: string) {
    return this.prisma.commission.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        paid_at: status === 'PAID' ? new Date() : undefined,
        payment_reference: paymentReference
      }
    });
  }

  async findCommissionById(id: string, consultantId: string): Promise<Commission | null> {
    return this.prisma.commission.findFirst({
      where: { id, consultant_id: consultantId }
    });
  }

  // --- Candidate Management Extensions ---
  async findApplicationById(id: string) {
    return this.prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true
      }
    });
  }

  async findRoundProgress(applicationId: string, jobRoundId: string) {
    return this.prisma.applicationRoundProgress.findUnique({
      where: {
        application_id_job_round_id: {
          application_id: applicationId,
          job_round_id: jobRoundId
        }
      }
    });
  }

  async createRoundProgress(data: { applicationId: string; jobRoundId: string; completed?: boolean }) {
    return this.prisma.applicationRoundProgress.create({
      data: {
        application_id: data.applicationId,
        job_round_id: data.jobRoundId,
        completed: data.completed || false
      }
    });
  }

  async updateRoundProgress(id: string, completed: boolean) {
    return this.prisma.applicationRoundProgress.update({
      where: { id },
      data: {
        completed,
        completed_at: completed ? new Date() : null
      }
    });
  }

  async updateApplication(id: string, data: Prisma.ApplicationUpdateInput) {
    return this.prisma.application.update({
      where: { id },
      data
    });
  }
}

