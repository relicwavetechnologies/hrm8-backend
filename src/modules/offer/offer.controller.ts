import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { OfferService } from './offer.service';
import { AuthenticatedRequest } from '../../types';

export class OfferController extends BaseController {
  
  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const offer = await OfferService.createOffer(req.body, req.user?.id || 'system');
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  send = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const offer = await OfferService.sendOffer(id);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getByApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId as string;
      const offers = await OfferService.getByApplication(applicationId);
      return this.sendSuccess(res, { offers });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const offer = await OfferService.getById(id);
      if (!offer) return this.sendError(res, new Error('Offer not found'), 404);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const offer = await OfferService.updateOffer(id, req.body);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  accept = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      // Assuming candidate is authenticated or we verify ID via middleware context
      // If user is candidate:
      const candidateId = (req as any).candidate?.id || req.body.candidateId; 
      const offer = await OfferService.acceptOffer(id, candidateId);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  decline = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const candidateId = (req as any).candidate?.id || req.body.candidateId;
      const offer = await OfferService.declineOffer(id, candidateId, reason);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
