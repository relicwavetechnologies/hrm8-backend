import { Router } from 'express';
import { IntegrationController } from './integration.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const integrationController = new IntegrationController();

router.post('/', authenticate, integrationController.configure);
router.get('/', authenticate, integrationController.list);
router.delete('/:id', authenticate, integrationController.remove);

export default router;
