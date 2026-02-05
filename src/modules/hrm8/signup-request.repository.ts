import { BaseRepository } from '../../core/repository';
import { SignupRequestStatus } from '@prisma/client';

export class SignupRequestRepository extends BaseRepository {
    async findAll(status?: SignupRequestStatus) {
        const where: any = {};
        if (status) where.status = status;

        return this.prisma.signupRequest.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });
    }

    async findById(id: string) {
        return this.prisma.signupRequest.findUnique({
            where: { id }
        });
    }

    async updateStatus(id: string, status: SignupRequestStatus, adminId: string, notes?: string) {
        return this.prisma.signupRequest.update({
            where: { id },
            data: {
                status,
                reviewed_at: new Date(),
                reviewed_by: adminId,
                rejection_reason: notes
            }
        });
    }
}
