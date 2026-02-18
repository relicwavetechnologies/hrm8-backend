"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
const env_1 = require("../../config/env");
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: env_1.env.CLOUDINARY_CLOUD_NAME,
    api_key: env_1.env.CLOUDINARY_API_KEY,
    api_secret: env_1.env.CLOUDINARY_API_SECRET,
});
class CloudinaryService {
    /**
     * Upload a file buffer to Cloudinary
     */
    static async uploadFile(buffer, fileName, options = {}) {
        return new Promise((resolve, reject) => {
            const uploadOptions = {
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
            const uploadStream = cloudinary_1.v2.uploader.upload_stream(uploadOptions, (error, result) => {
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
            });
            // Convert buffer to stream and pipe to Cloudinary
            const readable = new stream_1.Readable();
            readable.push(buffer);
            readable.push(null);
            readable.pipe(uploadStream);
        });
    }
    /**
     * Upload a file from multer file object
     */
    static async uploadMulterFile(file, options = {}) {
        if (!file.buffer) {
            throw new Error('File buffer is required');
        }
        return this.uploadFile(file.buffer, file.originalname, options);
    }
    /**
     * Delete a file from Cloudinary
     */
    static async deleteFile(publicId, resourceType = 'raw') {
        return new Promise((resolve, reject) => {
            cloudinary_1.v2.uploader.destroy(publicId, { resource_type: resourceType }, (error) => {
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
    static getSecureUrl(publicId) {
        return cloudinary_1.v2.url(publicId, { secure: true });
    }
    /**
     * Check if Cloudinary is configured
     */
    static isConfigured() {
        return !!(env_1.env.CLOUDINARY_CLOUD_NAME &&
            env_1.env.CLOUDINARY_API_KEY &&
            env_1.env.CLOUDINARY_API_SECRET);
    }
}
exports.CloudinaryService = CloudinaryService;
