"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferController = void 0;
const controller_1 = require("../../core/controller");
const offer_service_1 = require("./offer.service");
class OfferController extends controller_1.BaseController {
    constructor() {
        super(...arguments);
        this.create = async (req, res) => {
            try {
                const offer = await offer_service_1.OfferService.createOffer(req.body, req.user?.id || 'system');
                return this.sendSuccess(res, { offer });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.send = async (req, res) => {
            try {
                const id = req.params.id;
                const offer = await offer_service_1.OfferService.sendOffer(id);
                return this.sendSuccess(res, { offer });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getByApplication = async (req, res) => {
            try {
                const applicationId = req.params.applicationId;
                const offers = await offer_service_1.OfferService.getByApplication(applicationId);
                return this.sendSuccess(res, { offers });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getById = async (req, res) => {
            try {
                const id = req.params.id;
                const offer = await offer_service_1.OfferService.getById(id);
                if (!offer)
                    return this.sendError(res, new Error('Offer not found'), 404);
                return this.sendSuccess(res, { offer });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.update = async (req, res) => {
            try {
                const id = req.params.id;
                const offer = await offer_service_1.OfferService.updateOffer(id, req.body);
                return this.sendSuccess(res, { offer });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.accept = async (req, res) => {
            try {
                const id = req.params.id;
                // Assuming candidate is authenticated or we verify ID via middleware context
                // If user is candidate:
                const candidateId = req.candidate?.id || req.body.candidateId;
                const offer = await offer_service_1.OfferService.acceptOffer(id, candidateId);
                return this.sendSuccess(res, { offer });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.decline = async (req, res) => {
            try {
                const id = req.params.id;
                const { reason } = req.body;
                const candidateId = req.candidate?.id || req.body.candidateId;
                const offer = await offer_service_1.OfferService.declineOffer(id, candidateId, reason);
                return this.sendSuccess(res, { offer });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.OfferController = OfferController;
