import { Router } from 'express';
import { OfferController } from './offer.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new OfferController();

router.post('/', authenticate, controller.createOffer);
router.get('/application/:applicationId', authenticate, controller.getByApplication);
router.get('/:id', authenticate, controller.getOffer);
router.put('/:id', authenticate, controller.updateOffer);
router.post('/:id/send', authenticate, controller.sendOffer);
router.put('/:id/status', authenticate, controller.updateStatus);
router.post('/:id/accept', authenticate, controller.accept);
router.post('/:id/decline', authenticate, controller.decline);

// Withdrawal
router.post('/:offerId/withdraw', authenticate, controller.withdrawOffer);

// Negotiations
router.post('/:offerId/negotiations', authenticate, controller.initiateNegotiation);
router.get('/:offerId/negotiations', authenticate, controller.getNegotiationHistory);
router.post('/:offerId/negotiations/:negotiationId/respond', authenticate, controller.respondToNegotiation);
router.post('/:offerId/negotiations/:negotiationId/accept', authenticate, controller.acceptNegotiatedTerms); // Admin accept? Controller has it.

// Documents
router.post('/:offerId/documents', authenticate, controller.createDocumentRequest);
router.get('/:offerId/documents', authenticate, controller.getRequiredDocuments);
router.post('/:offerId/documents/:documentId/upload', authenticate, controller.uploadDocument); // Admin upload on behalf?
router.post('/:offerId/documents/:documentId/review', authenticate, controller.reviewDocument);

// Candidate Routes (Assuming candidate is authenticated user or using same auth middleware for now)
router.get('/candidate/offers/:offerId', authenticate, controller.getCandidateOffer);
router.post('/candidate/offers/:offerId/negotiations', authenticate, controller.candidateInitiateNegotiation);
router.post('/candidate/offers/:offerId/negotiations/:negotiationId/accept', authenticate, controller.acceptNegotiatedTerms); // Candidate accept? Reusing logic?
router.post('/candidate/offers/:offerId/documents/:documentId/upload', authenticate, controller.uploadDocument); // Candidate upload

export default router;
