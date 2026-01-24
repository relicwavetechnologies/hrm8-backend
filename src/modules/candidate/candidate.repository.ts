import type { Prisma, Candidate } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class CandidateRepository extends BaseRepository {
  
  async create(data: Prisma.CandidateCreateInput): Promise<Candidate> {
    return this.prisma.candidate.create({ data });
  }

  async update(id: string, data: Prisma.CandidateUpdateInput): Promise<Candidate> {
    return this.prisma.candidate.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<Candidate | null> {
    return this.prisma.candidate.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<Candidate | null> {
    return this.prisma.candidate.findUnique({
      where: { email },
    });
  }

  async delete(id: string): Promise<Candidate> {
    return this.prisma.candidate.delete({
      where: { id },
    });
  }

  async updateLastLogin(id: string): Promise<Candidate> {
    return this.prisma.candidate.update({
      where: { id },
      data: { last_login_at: new Date() },
    });
  }

  // Session Management
  async createSession(data: Prisma.CandidateSessionCreateInput) {
    return this.prisma.candidateSession.create({
      data,
    });
  }

  async findSessionBySessionId(sessionId: string) {
    return this.prisma.candidateSession.findUnique({
      where: { session_id: sessionId },
      include: { candidate: true },
    });
  }

  async deleteSession(sessionId: string) {
    return this.prisma.candidateSession.delete({
      where: { session_id: sessionId },
    });
  }
}
