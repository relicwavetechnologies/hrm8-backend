"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateOffersController = void 0;
const controller_1 = require("../../core/controller");
const offer_service_1 = require("../offer/offer.service");
class CandidateOffersController extends controller_1.BaseController {
    constructor() {
        super(...arguments);
        this.getOffer = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
                const offer = await offer_service_1.OfferService.getById(offerId);
                if (!offer) {
                    return this.sendError(res, new Error('Offer not found'), 404);
                }
                // Verify offer belongs to candidate
                if (offer.candidate_id !== req.candidate.id) {
                    return this.sendError(res, new Error('Unauthorized'), 403);
                }
                return this.sendSuccess(res, { offer });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.acceptOffer = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
                const offer = await offer_service_1.OfferService.acceptOffer(offerId, req.candidate.id);
                return this.sendSuccess(res, { offer });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.declineOffer = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
                const { reason } = req.body;
                const offer = await offer_service_1.OfferService.declineOffer(offerId, req.candidate.id, reason);
                return this.sendSuccess(res, { offer });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.initiateNegotiation = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
                const negotiation = await offer_service_1.OfferService.initiateNegotiation(offerId, req.candidate.id, req.body);
                res.status(201);
                return this.sendSuccess(res, { negotiation, message: 'Negotiation initiated successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.respondToNegotiation = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const negotiationId = Array.isArray(req.params.negotiationId) ? req.params.negotiationId[0] : req.params.negotiationId;
                const { response } = req.body;
                if (!response) {
                    return this.sendError(res, new Error('Response is required'));
                }
                const updated = await offer_service_1.OfferService.respondToNegotiation(negotiationId, req.candidate.id, response);
                return this.sendSuccess(res, { negotiation: updated });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.uploadDocument = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
                const document = await offer_service_1.OfferService.uploadDocument(offerId, req.candidate.id, req.body);
                res.status(201);
                return this.sendSuccess(res, { document, message: 'Document uploaded successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getOfferDocuments = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
                const documents = await offer_service_1.OfferService.getOfferDocuments(offerId, req.candidate.id);
                return this.sendSuccess(res, { documents });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getNegotiations = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const offerId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
                const negotiations = await offer_service_1.OfferService.getNegotiations(offerId, req.candidate.id);
                return this.sendSuccess(res, { negotiations });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.CandidateOffersController = CandidateOffersController;
