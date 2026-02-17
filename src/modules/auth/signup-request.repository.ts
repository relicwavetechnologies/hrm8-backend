import { PrismaClient, SignupRequest, Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class SignupRequestRepository extends BaseRepository {
    async findMany(where: Prisma.SignupRequestWhereInput): Promise<SignupRequest[]> {
        return this.prisma.signupRequest.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
    }

    async findById(id: string): Promise<SignupRequest | null> {
        return this.prisma.signupRequest.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: Prisma.SignupRequestUpdateInput): Promise<SignupRequest> {
        return this.prisma.signupRequest.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<SignupRequest> {
        return this.prisma.signupRequest.delete({
            where: { id },
        });
    }
}
