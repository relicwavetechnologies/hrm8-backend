import { BaseRepository } from '../../core/repository';
import { JobRound, JobRoundType } from './job-rounds.types';

export class JobRoundRepository extends BaseRepository {
    async findJobRounds(jobId: string): Promise<JobRound[]> {
        const rounds = await this.prisma.jobRound.findMany({
            where: { job_id: jobId },
            orderBy: { order: 'asc' }
        });

        return rounds.map(this.mapToEntity);
    }

    async findRound(roundId: string): Promise<any | null> {
        return this.prisma.jobRound.findUnique({
            where: { id: roundId },
            include: {
                job: {
                    select: {
                        company_id: true
                    }
                }
            }
        });
    }

    async findJobById(jobId: string) {
        return this.prisma.job.findUnique({
            where: { id: jobId },
            select: { id: true, company_id: true }
        });
    }

    async createRound(data: {
        job_id: string;
        name: string;
        type: string;
        order: number;
        is_fixed?: boolean;
        fixed_key?: string;
    }): Promise<JobRound> {
        const round = await this.prisma.jobRound.create({
            data: {
                job_id: data.job_id,
                name: data.name,
                type: data.type as any, // Cast to any to bypass potential Enum mismatch during migration if needed, but theoretically should match
                order: data.order,
                is_fixed: data.is_fixed || false,
                fixed_key: data.fixed_key
            }
        });

        return this.mapToEntity(round);
    }

    async updateRound(id: string, data: {
        name?: string;
        type?: string;
        order?: number;
    }): Promise<JobRound> {
        const round = await this.prisma.jobRound.update({
            where: { id },
            data: {
                name: data.name,
                type: data.type as any,
                order: data.order
            }
        });

        return this.mapToEntity(round);
    }

    async deleteRound(id: string): Promise<void> {
        await this.prisma.jobRound.delete({
            where: { id }
        });
    }

    async getNextOrder(jobId: string): Promise<number> {
        const lastRound = await this.prisma.jobRound.findFirst({
            where: { job_id: jobId },
            orderBy: { order: 'desc' }
        });
        return (lastRound?.order || 0) + 1;
    }

    async reorderRounds(jobId: string): Promise<void> {
        const rounds = await this.prisma.jobRound.findMany({
            where: { job_id: jobId },
            orderBy: { order: 'asc' }
        });

        for (let i = 0; i < rounds.length; i++) {
            if (rounds[i].order !== i + 1) {
                await this.prisma.jobRound.update({
                    where: { id: rounds[i].id },
                    data: { order: i + 1 }
                });
            }
        }
    }

    // Helper to map Prisma result to domain entity
    private mapToEntity(prismaRound: any): JobRound {
        return {
            id: prismaRound.id,
            job_id: prismaRound.job_id,
            name: prismaRound.name,
            order: prismaRound.order,
            type: prismaRound.type as JobRoundType,
            is_fixed: prismaRound.is_fixed,
            fixed_key: prismaRound.fixed_key,
            created_at: prismaRound.created_at,
            updated_at: prismaRound.updated_at
        };
    }
}
