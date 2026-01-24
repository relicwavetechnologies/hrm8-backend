import { BaseService } from '../../core/service';
import { IntegrationRepository } from './integration.repository';
import { Integration, IntegrationType, IntegrationStatus } from '@prisma/client';
import { HttpException } from '../../core/http-exception';

export class IntegrationService extends BaseService {
  constructor(private integrationRepository: IntegrationRepository) {
    super();
  }

  async configureIntegration(
    companyId: string, 
    type: IntegrationType, 
    config: any,
    name: string
  ): Promise<Integration> {
    const existing = await this.integrationRepository.findByCompanyAndType(companyId, type);
    
    if (existing) {
      return this.integrationRepository.update(existing.id, {
        config,
        status: 'ACTIVE',
        updated_at: new Date()
      });
    }

    return this.integrationRepository.create({
      company: { connect: { id: companyId } },
      type,
      name,
      config,
      status: 'ACTIVE',
    });
  }

  async getIntegration(id: string, companyId: string) {
    const integration = await this.integrationRepository.findById(id);
    if (!integration) throw new HttpException(404, 'Integration not found');
    if (integration.company_id !== companyId) throw new HttpException(403, 'Unauthorized');
    return integration;
  }

  async getCompanyIntegrations(companyId: string) {
    return this.integrationRepository.findAllByCompany(companyId);
  }

  async removeIntegration(id: string, companyId: string) {
    const integration = await this.integrationRepository.findById(id);
    if (!integration) throw new HttpException(404, 'Integration not found');
    if (integration.company_id !== companyId) throw new HttpException(403, 'Unauthorized');
    
    return this.integrationRepository.delete(id);
  }
}
