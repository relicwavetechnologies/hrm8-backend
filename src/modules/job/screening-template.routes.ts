import { Router } from 'express';
import { ScreeningTemplateController } from './screening-template.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new ScreeningTemplateController();

router.get('/', authenticate, controller.list);
router.post('/', authenticate, controller.create);
router.get('/:id', authenticate, controller.getById);

export default router;
