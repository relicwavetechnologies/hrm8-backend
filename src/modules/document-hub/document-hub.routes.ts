import { Router } from 'express';
import { DocumentHubController } from './document-hub.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import multer from 'multer';

const router = Router();
const controller = new DocumentHubController();

// Multer config for file uploads (store in memory, max 25MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});

// All routes require authentication
router.get('/', authenticate, controller.list);
router.post('/', authenticate, upload.single('file'), controller.upload);
router.delete('/:id', authenticate, controller.remove);

export default router;
