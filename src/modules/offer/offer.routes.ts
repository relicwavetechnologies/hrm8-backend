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

export default router;
