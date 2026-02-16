import { Router } from 'express';

import { exampleController } from './example.controller';

const router = Router();

router.post('/', exampleController.createExample as any);
router.get('/', exampleController.getExamples as any);

export default router;


