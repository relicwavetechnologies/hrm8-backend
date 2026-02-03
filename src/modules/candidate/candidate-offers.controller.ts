import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CandidateAuthenticatedRequest } from '../../types';
import { OfferService } from '../offer/offer.service';

export class CandidateOffersController extends BaseController {

  getOffer = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
      const offer = await OfferService.getById(offerId);

      if (!offer) {
        return this.sendError(res, new Error('Offer not found'), 404);
      }

      // Verify offer belongs to candidate
      if (offer.candidate_id !== req.candidate.id) {
        return this.sendError(res, new Error('Unauthorized'), 403);
      }

      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  acceptOffer = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;

      const offer = await OfferService.acceptOffer(offerId, req.candidate.id);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  declineOffer = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
      const { reason } = req.body;

      const offer = await OfferService.declineOffer(offerId, req.candidate.id, reason);
      return this.sendSuccess(res, { offer });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  initiateNegotiation = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;

      const negotiation = await OfferService.initiateNegotiation(offerId, req.candidate.id, req.body);
      res.status(201);
      return this.sendSuccess(res, { negotiation, message: 'Negotiation initiated successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  respondToNegotiation = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const negotiationId = Array.isArray(req.params.negotiationId) ? req.params.negotiationId[0] : req.params.negotiationId;
      const { response } = req.body;

      if (!response) {
        return this.sendError(res, new Error('Response is required'));
      }

      const updated = await OfferService.respondToNegotiation(negotiationId, req.candidate.id, response);
      return this.sendSuccess(res, { negotiation: updated });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  uploadDocument = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;

      const document = await OfferService.uploadDocument(offerId, req.candidate.id, req.body);
      res.status(201);
      return this.sendSuccess(res, { document, message: 'Document uploaded successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getOfferDocuments = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;

      const documents = await OfferService.getOfferDocuments(offerId, req.candidate.id);
      return this.sendSuccess(res, { documents });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getNegotiations = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));
      const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;

      const negotiations = await OfferService.getNegotiations(offerId, req.candidate.id);
      return this.sendSuccess(res, { negotiations });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
