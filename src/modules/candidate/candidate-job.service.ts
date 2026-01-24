import { BaseService } from '../../core/service';

export class CandidateJobService extends BaseService {
  async processJobAlerts(job: any): Promise<void> {
    // Stub
  }
}

export const candidateJobService = new CandidateJobService();
