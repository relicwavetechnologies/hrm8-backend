import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { env } from '../../config/env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

export interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  allowedFormats?: string[];
  maxFileSize?: number; // in bytes
}

export class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary
   */
  static async uploadFile(
    buffer: Buffer,
    fileName: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder: options.folder || 'hrm8/applications',
        resource_type: options.resourceType || 'auto',
        public_id: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
        overwrite: false,
        unique_filename: true,
      };

      // Determine resource type from file extension if not specified
      if (!options.resourceType) {
        const ext = fileName.toLowerCase().split('.').pop();
        if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
          uploadOptions.resource_type = 'raw';
        }
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: any, result: any) => {
          if (error) {
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
            return;
          }

          if (!result) {
            reject(new Error('Cloudinary upload returned no result'));
            return;
          }

          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            format: result.format || 'unknown',
            width: result.width,
            height: result.height,
            bytes: result.bytes,
          });
        }
      );

      // Convert buffer to stream and pipe to Cloudinary
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Upload a file from multer file object
   */
  static async uploadMulterFile(
    file: { buffer: Buffer; originalname: string },
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    if (!file.buffer) {
      throw new Error('File buffer is required');
    }

    return this.uploadFile(file.buffer, file.originalname, options);
  }

  /**
   * Delete a file from Cloudinary
   */
  static async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'raw'): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error: any) => {
        if (error) {
          reject(new Error(`Failed to delete file: ${error.message}`));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Get a secure URL for a file
   */
  static getSecureUrl(publicId: string): string {
    return cloudinary.url(publicId, { secure: true });
  }

  /**
   * Check if Cloudinary is configured
   */
  static isConfigured(): boolean {
    return !!(
      env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET
    );
  }
}
