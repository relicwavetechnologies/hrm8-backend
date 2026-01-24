import { BaseService } from '../../core/service';

export class JobAllocationService extends BaseService {
  async autoAssignJob(jobId: string): Promise<void> {
    // Stub
  }

  async getPipelineForJob(jobId: string, consultantId?: string | null): Promise<any> {
    // Stub
    return null;
  }

  async getPipelineForConsultantJob(consultantId: string, jobId: string) {
    return { stage: 'SOURCING', progress: 0 };
  }

  async updatePipelineForConsultantJob(consultantId: string, jobId: string, data: any) {
    return { success: true, pipeline: { ...data } };
  }
}

export const jobAllocationService = new JobAllocationService();
