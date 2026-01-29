import { Router } from 'express';
import { OfferController } from './offer.controller';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';

const router = Router();
const controller = new OfferController();

// Basic CRUD / Management
router.post('/', unifiedAuthenticate, controller.createOffer);
router.get('/application/:applicationId', unifiedAuthenticate, controller.getOffersByApplication);
router.get('/:id', unifiedAuthenticate, controller.getOffer);
router.put('/:id', unifiedAuthenticate, controller.updateOffer);
router.post('/:id/send', unifiedAuthenticate, controller.sendOffer);
router.put('/:id/status', unifiedAuthenticate, controller.updateStatus);
router.post('/:id/accept', unifiedAuthenticate, controller.acceptOffer);
router.post('/:id/decline', unifiedAuthenticate, controller.declineOffer);

// Withdrawal
router.post('/:offerId/withdraw', unifiedAuthenticate, controller.withdrawOffer);

// Negotiations
router.post('/:offerId/negotiations', unifiedAuthenticate, controller.initiateNegotiation);
router.get('/:offerId/negotiations', unifiedAuthenticate, controller.getNegotiationHistory);
router.post('/:offerId/negotiations/:negotiationId/respond', unifiedAuthenticate, controller.respondToNegotiation);
router.post('/:offerId/negotiations/:negotiationId/accept', unifiedAuthenticate, controller.acceptNegotiatedTerms);

// Documents
router.post('/:offerId/documents', unifiedAuthenticate, controller.createDocumentRequest);
router.get('/:offerId/documents', unifiedAuthenticate, controller.getRequiredDocuments);
router.post('/:offerId/documents/:documentId/upload', unifiedAuthenticate, controller.uploadDocument);
router.post('/:offerId/documents/:documentId/review', unifiedAuthenticate, controller.reviewDocument);

// Candidate Specific Views
router.get('/candidate-view/:id', unifiedAuthenticate, controller.getCandidateOffer);

export default router;
