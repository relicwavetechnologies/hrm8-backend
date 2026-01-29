
import { BaseRepository } from '../../core/repository';
import { JobRound } from '@prisma/client';

export class JobRoundRepository extends BaseRepository {
    /**
     * Find a job round by job ID and fixed key (e.g. 'OFFER', 'HIRED')
     */
    async findByJobIdAndFixedKey(jobId: string, fixedKey: string): Promise<JobRound | null> {
        return this.prisma.jobRound.findFirst({
            where: {
                job_id: jobId,
                fixed_key: fixedKey
            }
        });
    }
}
