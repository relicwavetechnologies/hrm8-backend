import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { IntegrationService } from './integration.service';
import { IntegrationRepository } from './integration.repository';
import { AuthenticatedRequest } from '../../types';

export class IntegrationController extends BaseController {
  private integrationService: IntegrationService;

  constructor() {
    super();
    this.integrationService = new IntegrationService(new IntegrationRepository());
  }

  configure = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { type, config, name } = req.body;
      const integration = await this.integrationService.configureIntegration(
        req.user.companyId, 
        type, 
        config, 
        name || type
      );
      return this.sendSuccess(res, { integration });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  list = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const integrations = await this.integrationService.getCompanyIntegrations(req.user.companyId);
      return this.sendSuccess(res, { integrations });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  remove = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const { id } = req.params as { id: string };
      await this.integrationService.removeIntegration(id, req.user.companyId);
      return this.sendSuccess(res, { message: 'Integration removed' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
