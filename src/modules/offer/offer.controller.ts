import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { OfferService } from './offer.service';
import { OfferRepository } from './offer.repository';
import { AuthenticatedRequest } from '../../types';
import {
  CreateOfferRequest,
  UpdateOfferRequest,
  SendOfferRequest,
  NegotiationRequest,
  DocumentRequest,
  ReviewDocumentRequest,
  WithdrawOfferRequest,
  DocumentStatus
} from './offer.types';
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

  /**
   * Withdraw Offer
   */
  withdrawOffer = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId } = req.params;
      const { reason }: WithdrawOfferRequest = req.body;
      const result = await this.service.withdrawOffer(offerId as string, reason, req.user.id);
      return this.sendSuccess(res, result, 'Offer withdrawn');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- NEGOTIATIONS ---

  initiateNegotiation = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId } = req.params;
      const data: NegotiationRequest = req.body;
      // Check if candidate or company user
      // For /candidate/ routes, we might have different user context
      // Here assuming company user initiates
      const result = await this.service.initiateNegotiation(
        offerId as string,
        data,
        req.user.id,
        'COMPANY',
        req.user.name
      );
      return this.sendSuccess(res, result, 'Negotiation initiated');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  candidateInitiateNegotiation = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401); // Candidate auth
      const { offerId } = req.params;
      const data: NegotiationRequest = req.body;
      const result = await this.service.initiateNegotiation(
        offerId as string,
        data,
        req.user.id,
        'CANDIDATE',
        req.user.name || 'Candidate'
      );
      return this.sendSuccess(res, result, 'Negotiation initiated');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  respondToNegotiation = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId, negotiationId } = req.params;
      const { message } = req.body;
      const result = await this.service.respondToNegotiation(offerId as string, negotiationId as string, message, req.user.id);
      return this.sendSuccess(res, result, 'Response sent');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getNegotiationHistory = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId } = req.params;
      const result = await this.service.getNegotiationHistory(offerId as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  acceptNegotiatedTerms = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId, negotiationId } = req.params;
      const result = await this.service.acceptNegotiatedTerms(offerId as string, negotiationId as string, req.user.id);
      return this.sendSuccess(res, result, 'Terms accepted');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- DOCUMENTS ---

  createDocumentRequest = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId } = req.params;
      const data: DocumentRequest = req.body;
      const result = await this.service.createDocumentRequest(offerId as string, data);
      return this.sendSuccess(res, result, 'Document requested');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getRequiredDocuments = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId } = req.params;
      const result = await this.service.getRequiredDocuments(offerId as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  uploadDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId, documentId } = req.params;
      const { fileUrl, fileName } = req.body; // Assuming file uploaded via separate service and URL provided
      const result = await this.service.uploadDocument(offerId as string, documentId as string, fileUrl, fileName, req.user.id);
      return this.sendSuccess(res, result, 'Document uploaded');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  reviewDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId, documentId } = req.params;
      const { status, notes }: ReviewDocumentRequest = req.body;
      const result = await this.service.reviewDocument(offerId as string, documentId as string, status, notes, req.user.id);
      return this.sendSuccess(res, result, 'Document reviewed');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCandidateOffer = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId } = req.params;
      const result = await this.service.getCandidateOffer(offerId as string, req.user.id);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
