import { Router } from 'express';
import { IntegrationController } from './integration.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const integrationController = new IntegrationController();

router.post('/', authenticate, integrationController.configure as any);
router.get('/', authenticate, integrationController.list as any);
router.delete('/:id', authenticate, integrationController.remove as any);

export default router;
