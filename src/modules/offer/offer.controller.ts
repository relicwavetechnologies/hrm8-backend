import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { OfferService } from './offer.service';
import { UnifiedAuthenticatedRequest } from '../../types';

export class OfferController extends BaseController {

  create = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const offer = await OfferService.createOffer(req.body, req.user?.id || 'system');
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  send = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const offer = await OfferService.sendOffer(id);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getByApplication = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId as string;
      const offers = await OfferService.getByApplication(applicationId);
      return this.sendSuccess(res, { offers });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getById = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const offer = await OfferService.getById(id);
      if (!offer) return this.sendError(res, new Error('Offer not found'), 404);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  update = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const offer = await OfferService.updateOffer(id, req.body);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  accept = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const candidateId = req.candidate?.id || req.body.candidateId;
      const offer = await OfferService.acceptOffer(id, candidateId);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  decline = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const candidateId = req.candidate?.id || req.body.candidateId;
      const offer = await OfferService.declineOffer(id, candidateId, reason);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
