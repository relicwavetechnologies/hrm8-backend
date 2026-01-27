import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { ApplicationUploadService } from './application-upload.service';
import { AuthenticatedRequest } from '../../types';

export class ApplicationUploadController extends BaseController {
    private service: ApplicationUploadService;

    constructor() {
        super('application-upload');
        this.service = new ApplicationUploadService();
    }

    /**
     * Upload an application file
     * POST /api/application-upload/upload
     */
    uploadFile = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.file) {
                return this.sendError(res, new Error('No file provided'), 400);
            }

            // Upload via module service
            const result = await this.service.uploadFile(req.file);

            const fileData = {
                url: result.secure_url,
                publicId: result.public_id,
                filename: req.file.originalname,
                format: result.format,
                size: result.bytes,
            };

            return this.sendSuccess(res, fileData, 'File uploaded successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Delete an application file
     * DELETE /api/application-upload/:publicId
     */
    deleteFile = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const publicId = req.params.publicId as string;

            if (!publicId) {
                return this.sendError(res, new Error('Public ID is required'), 400);
            }

            await this.service.deleteFile(publicId);

            return this.sendSuccess(res, { success: true }, 'File deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
