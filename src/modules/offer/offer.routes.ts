import { Router } from 'express';
import { OfferController } from './offer.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import multer from 'multer';

const router = Router();
const offerController = new OfferController();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/application/:applicationId/workflow', authenticate, offerController.getWorkflowByApplication);
router.put('/application/:applicationId/workflow', authenticate, offerController.updateWorkflowByApplication);
router.post(
  '/application/:applicationId/workflow/documents',
  authenticate,
  upload.array('files'),
  offerController.uploadWorkflowDocuments
);

router.post('/', authenticate, offerController.create);
router.post('/:id/send', authenticate, offerController.send);
router.get('/application/:applicationId', authenticate, offerController.getByApplication);
router.get('/:id', authenticate, offerController.getById);
router.patch('/:id', authenticate, offerController.update);
router.post('/:id/accept', authenticate, offerController.accept); // Auth needs to support candidates
router.post('/:id/decline', authenticate, offerController.decline);

export default router;
