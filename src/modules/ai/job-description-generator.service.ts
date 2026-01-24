import { BaseService } from '../../core/service';

export class JobDescriptionGeneratorService extends BaseService {
  async generateWithAI(data: any): Promise<any> {
    // Stub
    return { description: "AI generated description", requirements: [], responsibilities: [] };
  }
}

export const jobDescriptionGeneratorService = new JobDescriptionGeneratorService();
