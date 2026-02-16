import { Router } from 'express';
import { OfferController } from './offer.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const offerController = new OfferController();

router.post('/', authenticate, offerController.create as any);
router.post('/:id/send', authenticate, offerController.send as any);
router.get('/application/:applicationId', authenticate, offerController.getByApplication as any);
router.get('/:id', authenticate, offerController.getById as any);
router.patch('/:id', authenticate, offerController.update as any);
router.post('/:id/accept', authenticate, offerController.accept as any); // Auth needs to support candidates
router.post('/:id/decline', authenticate, offerController.decline as any);

export default router;
