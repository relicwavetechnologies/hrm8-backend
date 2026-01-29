import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { OfferService } from './offer.service';
import { OfferRepository } from './offer.repository';
import { ApplicationService } from '../application/application.service';
import { ApplicationRepository } from '../application/application.repository';
import { EmailService } from '../email/email.service';
import { JobRoundRepository } from '../job/job-round.repository';
import { UnifiedAuthenticatedRequest } from '../../types';
import {
  CreateOfferRequest,
  UpdateOfferRequest,
  SendOfferRequest,
  WithdrawOfferRequest,
  NegotiationRequest,
  DocumentRequest,
  ReviewDocumentRequest
} from './offer.types';
import { OfferStatus } from '../../types';

export class OfferController extends BaseController {
  private service: OfferService;

  constructor() {
    super('offer');
    const offerRepository = new OfferRepository();
    const applicationRepository = new ApplicationRepository();
    const applicationService = new ApplicationService(applicationRepository);
    const emailService = new EmailService();
    const jobRoundRepository = new JobRoundRepository();

    this.service = new OfferService(
      offerRepository,
      applicationService,
      emailService,
      jobRoundRepository,
      applicationRepository
    );
  }

  createOffer = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const request: CreateOfferRequest = req.body;
      const result = await this.service.createOffer(request, req.user.id);
      return this.sendSuccess(res, result, 'Offer created successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getOffer = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.getOffer(id as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateOffer = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const request: UpdateOfferRequest = req.body;
      const result = await this.service.updateOffer(id as string, request);
      return this.sendSuccess(res, result, 'Offer updated successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  sendOffer = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const { id } = req.params;
      const request: SendOfferRequest = req.body;
      const result = await this.service.sendOffer(id as string, req.user.id, request);
      return this.sendSuccess(res, result, 'Offer sent successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  updateStatus = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || !Object.values(OfferStatus).includes(status)) {
        return this.sendError(res, new Error('Invalid status'), 400);
      }
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const result = await this.service.updateStatus(id as string, status as OfferStatus, req.user.id);
      return this.sendSuccess(res, result, 'Offer status updated');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getOffersByApplication = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { applicationId } = req.params;
      const result = await this.service.getOffersByApplication(applicationId as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  acceptOffer = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.candidate?.id || req.body.candidateId;
      if (!userId) return this.sendError(res, new Error('User identity required'), 400);
      const result = await this.service.acceptOffer(id as string, userId);
      return this.sendSuccess(res, result, 'Offer accepted');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  declineOffer = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.candidate?.id || req.body.candidateId;
      if (!userId) return this.sendError(res, new Error('User identity required'), 400);
      const result = await this.service.declineOffer(id as string, userId);
      return this.sendSuccess(res, result, 'Offer declined');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  withdrawOffer = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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

  initiateNegotiation = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const { offerId } = req.params;
      const data: NegotiationRequest = req.body;

      const senderId = req.user?.id || req.candidate?.id;
      const senderType = req.candidate ? 'CANDIDATE' : 'COMPANY';
      const senderName = req.user?.name || req.candidate?.firstName || 'User';

      if (!senderId) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await this.service.initiateNegotiation(
        offerId as string,
        data,
        senderId,
        senderType,
        senderName
      );
      return this.sendSuccess(res, result, 'Negotiation initiated');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  respondToNegotiation = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.user && !req.candidate) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId, negotiationId } = req.params;
      const { message } = req.body;
      const userId = req.user?.id || req.candidate?.id;
      const result = await this.service.respondToNegotiation(offerId as string, negotiationId as string, message, userId!);
      return this.sendSuccess(res, result, 'Response sent');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getNegotiationHistory = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.user && !req.candidate) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId } = req.params;
      const result = await this.service.getNegotiationHistory(offerId as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  acceptNegotiatedTerms = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id || req.candidate?.id;
      if (!userId) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId, negotiationId } = req.params;
      const result = await this.service.acceptNegotiatedTerms(offerId as string, negotiationId as string, userId);
      return this.sendSuccess(res, result, 'Terms accepted');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // --- DOCUMENTS ---

  createDocumentRequest = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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

  getRequiredDocuments = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      if (!req.user && !req.candidate) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId } = req.params;
      const result = await this.service.getRequiredDocuments(offerId as string);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  uploadDocument = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id || req.candidate?.id;
      if (!userId) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId, documentId } = req.params;
      const { fileUrl, fileName } = req.body;
      const result = await this.service.uploadDocument(offerId as string, documentId as string, fileUrl, fileName, userId);
      return this.sendSuccess(res, result, 'Document uploaded');
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  reviewDocument = async (req: UnifiedAuthenticatedRequest, res: Response) => {
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

  getCandidateOffer = async (req: UnifiedAuthenticatedRequest, res: Response) => {
    try {
      const candidateId = req.candidate?.id;
      if (!candidateId) return this.sendError(res, new Error('Unauthorized'), 401);
      const { offerId } = req.params;
      const result = await this.service.getCandidateOffer(offerId as string, candidateId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
