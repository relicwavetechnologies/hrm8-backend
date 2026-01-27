import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { OfferService } from './offer.service';
import { OfferRepository } from './offer.repository';
import { AuthenticatedRequest } from '../../types';
import { CreateOfferRequest, UpdateOfferRequest, SendOfferRequest } from './offer.types';
import { OfferStatus } from '../../types';

export class OfferController extends BaseController {
  private service: OfferService;

  constructor() {
    super('offer');
    this.service = new OfferService(new OfferRepository());
  }

  /**
   * Create Offer
   */
  createOffer = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'));
      const request: CreateOfferRequest = req.body;
      const result = await this.service.createOffer(request, req.user.id);
      return this.sendSuccess(res, result, 'Offer created successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Get Offer
   */
  getOffer = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.getOffer(id as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Update Offer
   */
  updateOffer = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const request: UpdateOfferRequest = req.body;
      const result = await this.service.updateOffer(id as string, request);
      return this.sendSuccess(res, result, 'Offer updated successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Send Offer
   */
  sendOffer = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'));
      const { id } = req.params;
      const request: SendOfferRequest = req.body;
      const result = await this.service.sendOffer(id as string, req.user.id, request);
      return this.sendSuccess(res, result, 'Offer sent successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Update Status
   */
  updateStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || !Object.values(OfferStatus).includes(status)) {
        return this.sendError(res, new Error('Invalid status'));
      }
      if (!req.user) return this.sendError(res, new Error('Unauthorized'));
      const result = await this.service.updateStatus(id as string, status as OfferStatus, req.user.id);
      return this.sendSuccess(res, result, 'Offer status updated');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Get Offers by Application
   */
  getByApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { applicationId } = req.params;
      const result = await this.service.getOffersByApplication(applicationId as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Accept Offer
   */
  accept = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'));
      const { id } = req.params;
      const result = await this.service.acceptOffer(id as string, req.user.id);
      return this.sendSuccess(res, result, 'Offer accepted');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /**
   * Decline Offer
   */
  decline = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'));
      const { id } = req.params;
      const result = await this.service.declineOffer(id as string, req.user.id);
      return this.sendSuccess(res, result, 'Offer declined');
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
