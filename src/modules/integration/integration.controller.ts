import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { IntegrationService } from './integration.service';
import { IntegrationRepository } from './integration.repository';
import { AuthenticatedRequest } from '../../types';
import { IntegrationStripeService, EntityType } from './stripe/IntegrationStripeService';
import { env } from '../../config/env';

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

  createCheckoutSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entityInfo = this.getEntityInfo(req.user);
      if (!entityInfo) return this.sendError(res, new Error('Unauthorized'), 401);

      const { entityType, entityId } = entityInfo;
      const { amount, description, successUrl, cancelUrl, metadata } = req.body;

      if (!amount || amount <= 0) return this.sendError(res, new Error('Valid amount is required'), 400);
      if (!description) return this.sendError(res, new Error('Description is required'), 400);

      let integration = await IntegrationStripeService.getStripeIntegration(entityType, entityId);
      if (!integration) {
        integration = await IntegrationStripeService.createStripeIntegration(entityType, entityId);
      }

      const session = await IntegrationStripeService.createPaymentSession(integration.id, {
        amount,
        currency: 'usd',
        description,
        successUrl: successUrl || `${env.FRONTEND_URL}/subscriptions?success=true`,
        cancelUrl: cancelUrl || `${env.FRONTEND_URL}/subscriptions?canceled=true`,
        metadata,
      });

      return this.sendSuccess(res, { sessionId: session.id, url: session.url });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  handleMockPaymentSuccess = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entityInfo = this.getEntityInfo(req.user);
      if (!entityInfo) return this.sendError(res, new Error('Unauthorized'), 401);

      const { entityId } = entityInfo;
      const { sessionId, amount } = req.body;

      if (!sessionId || !amount) return this.sendError(res, new Error('Session ID and amount are required'), 400);

      const { WalletService } = await import('../wallet/wallet.service');
      const virtualAccount = await WalletService.getOrCreateAccount('COMPANY', entityId);

      await WalletService.creditAccount({
        accountId: virtualAccount.id,
        amount: amount / 100,
        type: 'TRANSFER_IN',
        description: `Mock Stripe payment - Session ${sessionId.substring(0, 20)}`,
        referenceType: 'PAYMENT',
        referenceId: sessionId,
      });

      return this.sendSuccess(res, { message: 'Payment processed successfully', amount: amount / 100 });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  private getEntityInfo(user: AuthenticatedRequest['user']): { entityType: EntityType; entityId: string } | null {
    if (!user) return null;
    if (user.role === 'ADMIN' || user.companyId) { // Simplified for now
      return { entityType: 'COMPANY', entityId: user.companyId };
    }
    return { entityType: 'HRM8_USER', entityId: user.id };
  }
}
