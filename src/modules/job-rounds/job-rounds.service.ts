import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';
import { JobRoundRepository } from './job-rounds.repository';
import { CreateJobRoundRequest, JobRound, UpdateJobRoundRequest } from './job-rounds.types';

export class JobRoundService extends BaseService {
    constructor(private repository: JobRoundRepository) {
        super();
    }

    async getJobRounds(jobId: string, companyId: string): Promise<JobRound[]> {
        const job = await this.repository.findJobById(jobId);
        if (!job || job.company_id !== companyId) {
            throw new HttpException(403, 'Unauthorized access to job rounds');
        }

        return this.repository.findJobRounds(jobId);
    }

    async getRound(roundId: string, companyId: string): Promise<JobRound> {
        const round = await this.repository.findRound(roundId);
        if (!round) {
            throw new HttpException(404, 'Job round not found');
        }

        if (round.job.company_id !== companyId) {
            throw new HttpException(403, 'Unauthorized access to job round');
        }

        // Map to entity for return
        return {
            id: round.id,
            job_id: round.job_id,
            name: round.name,
            order: round.order,
            type: round.type,
            is_fixed: round.is_fixed,
            fixed_key: round.fixed_key,
            created_at: round.created_at,
            updated_at: round.updated_at
        };
    }

    async createRound(data: CreateJobRoundRequest, user: { companyId: string }): Promise<JobRound> {
        // Verify job ownership
        const job = await this.repository.findJobById(data.jobId);
        if (!job || job.company_id !== user.companyId) {
            throw new HttpException(403, 'Unauthorized to add rounds to this job');
        }

        // Determine order if not provided
        let order = data.order;
        if (order === undefined) {
            order = await this.repository.getNextOrder(data.jobId);
        }

        const round = await this.repository.createRound({
            job_id: data.jobId,
            name: data.name,
            type: data.type,
            order: order
        });

        // Trigger reorder if order was specified manually or just to be safe
        await this.repository.reorderRounds(data.jobId);

        return round;
    }

    async updateRound(id: string, data: UpdateJobRoundRequest, companyId: string): Promise<JobRound> {
        const round = await this.getRound(id, companyId); // Check existence and permissions

        const updated = await this.repository.updateRound(id, {
            name: data.name,
            type: data.type,
            order: data.order
        });

        if (data.order !== undefined) {
            await this.repository.reorderRounds(round.job_id);
        }

        return updated;
    }

    async deleteRound(id: string, companyId: string): Promise<void> {
        const round = await this.getRound(id, companyId);

        if (round.is_fixed) {
            throw new HttpException(400, 'Cannot delete fixed system rounds');
        }

        await this.repository.deleteRound(id);
        await this.repository.reorderRounds(round.job_id);
    }
}
