import { Router } from 'express';
import { DocumentHubController } from './document-hub.controller';
import multer from 'multer';

const router = Router();
const controller = new DocumentHubController();

// Multer config for file uploads (store in memory, max 25MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});

// List company documents
router.get('/', controller.list);

// Upload a document
router.post('/', upload.single('file'), controller.upload);

// Delete a document
router.delete('/:id', controller.remove);

export default router;
