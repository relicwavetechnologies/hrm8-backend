import { prisma } from '../../utils/prisma';
import { Prisma, Consultant, ConsultantRole, ConsultantStatus } from '@prisma/client';

export class StaffRepository {
    async create(data: Prisma.ConsultantCreateInput): Promise<Consultant> {
        return prisma.consultant.create({ data });
    }

    async findById(id: string): Promise<Consultant | null> {
        return prisma.consultant.findUnique({
            where: { id },
            include: {
                region: true,
            }
        });
    }

    async findByEmail(email: string): Promise<Consultant | null> {
        return prisma.consultant.findUnique({
            where: { email }
        });
    }

    async findMany(params: {
        where?: Prisma.ConsultantWhereInput;
        orderBy?: Prisma.ConsultantOrderByWithRelationInput;
        take?: number;
        skip?: number;
    }): Promise<Consultant[]> {
        return prisma.consultant.findMany({
            ...params,
            include: {
                region: true,
                _count: {
                    select: {
                        job_assignments: { where: { status: 'ACTIVE' } }
                    }
                }
            }
        });
    }

    async update(id: string, data: Prisma.ConsultantUpdateInput): Promise<Consultant> {
        return prisma.consultant.update({ where: { id }, data });
    }

    async delete(id: string): Promise<Consultant> {
        return prisma.consultant.delete({ where: { id } });
    }

    async count(where?: Prisma.ConsultantWhereInput): Promise<number> {
        return prisma.consultant.count({ where });
    }
}
