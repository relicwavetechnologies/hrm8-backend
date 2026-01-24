import { BaseService } from '../../core/service';

export class JobRoundService extends BaseService {
  async initializeFixedRounds(jobId: string): Promise<void> {
    // Stub
  }
}

export const jobRoundService = new JobRoundService();
