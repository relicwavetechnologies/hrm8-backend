import type { Prisma, Consultant, ConsultantJobAssignment, Commission } from '@prisma/client';
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

  async findJobAssignment(consultantId: string, jobId: string): Promise<ConsultantJobAssignment | null> {
    return this.prisma.consultantJobAssignment.findUnique({
      where: {
        consultant_id_job_id: {
          consultant_id: consultantId,
          job_id: jobId
        }
      }
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
}
