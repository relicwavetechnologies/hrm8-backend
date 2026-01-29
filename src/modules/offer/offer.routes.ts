import { Router } from 'express';
import { OfferController } from './offer.controller';
import { unifiedAuthenticate } from '../../middlewares/unified-auth.middleware';

const router = Router();
const offerController = new OfferController();

router.post('/', unifiedAuthenticate, offerController.create);
router.post('/:id/send', unifiedAuthenticate, offerController.send);
router.get('/application/:applicationId', unifiedAuthenticate, offerController.getByApplication);
router.get('/:id', unifiedAuthenticate, offerController.getById);
router.patch('/:id', unifiedAuthenticate, offerController.update);
router.post('/:id/accept', unifiedAuthenticate, offerController.accept); // Auth needs to support candidates
router.post('/:id/decline', unifiedAuthenticate, offerController.decline);

export default router;
