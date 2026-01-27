import { BaseService } from '../../core/service';
import { uploadService } from '../../services/upload.service';
import { UploadApiResponse } from 'cloudinary';

export class ApplicationUploadService extends BaseService {
    constructor() {
        super();
    }

    /**
     * Upload an application file
     */
    async uploadFile(file: Express.Multer.File): Promise<UploadApiResponse> {
        return uploadService.uploadFile(file, 'hrm8/applications');
    }

    /**
     * Delete an application file
     */
    async deleteFile(publicId: string): Promise<void> {
        return uploadService.deleteFile(publicId);
    }
}
