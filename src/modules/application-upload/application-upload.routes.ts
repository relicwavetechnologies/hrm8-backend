import { Router } from 'express';
import { ApplicationUploadController } from './application-upload.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();
const controller = new ApplicationUploadController();

// Upload file
router.post('/upload', authenticate, upload.single('file'), controller.uploadFile);

// Delete file
router.delete('/:publicId', authenticate, controller.deleteFile);

export default router;
