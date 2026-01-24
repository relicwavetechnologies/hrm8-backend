import type { Prisma, HRM8User } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class Hrm8Repository extends BaseRepository {
  
  async findByEmail(email: string): Promise<HRM8User | null> {
    return this.prisma.hRM8User.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<HRM8User | null> {
    return this.prisma.hRM8User.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.HRM8UserCreateInput): Promise<HRM8User> {
    return this.prisma.hRM8User.create({
      data,
    });
  }

  async update(id: string, data: Prisma.HRM8UserUpdateInput): Promise<HRM8User> {
    return this.prisma.hRM8User.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<HRM8User> {
    return this.prisma.hRM8User.delete({
      where: { id },
    });
  }

  // Session Methods
  async createSession(data: Prisma.HRM8SessionCreateInput) {
    return this.prisma.hRM8Session.create({
      data,
    });
  }

  async findSessionBySessionId(sessionId: string) {
    return this.prisma.hRM8Session.findUnique({
      where: { session_id: sessionId },
      include: { user: true },
    });
  }

  async deleteSession(sessionId: string) {
    return this.prisma.hRM8Session.delete({
      where: { session_id: sessionId },
    });
  }

  // Licensee & Regions
  async getRegionsForLicensee(licenseeId: string) {
    return this.prisma.region.findMany({
      where: { licensee_id: licenseeId },
    });
  }
}
