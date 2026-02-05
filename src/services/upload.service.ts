import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
import { Readable } from 'stream';

export class UploadService {
    constructor() {
        cloudinary.config({
            cloud_name: env.CLOUDINARY_CLOUD_NAME,
            api_key: env.CLOUDINARY_API_KEY,
            api_secret: env.CLOUDINARY_API_SECRET,
        });
    }

    /**
     * Upload a file to Cloudinary
     */
    async uploadFile(file: Express.Multer.File, folder: string = 'hrm8/applications'): Promise<UploadApiResponse> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'auto',
                },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) return reject(new Error('Upload failed: No result returned'));
                    resolve(result);
                }
            );

            // Convert buffer to stream
            const stream = Readable.from(file.buffer);
            stream.pipe(uploadStream);
        });
    }

    /**
     * Delete a file from Cloudinary 
     */
    async deleteFile(publicId: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error(`Failed to delete file ${publicId}:`, error);
            throw error;
        }
    }
}

export const uploadService = new UploadService();
