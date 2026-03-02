import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AuthenticatedRequest } from '../../types';
import { prisma } from '../../utils/prisma';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class DocumentHubController extends BaseController {
    constructor() {
        super('document-hub');
    }

    /**
     * GET /api/document-hub
     * List all company documents with optional search & category filter.
     */
    list = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) throw new Error('Unauthorized');

            const { search, category, limit: rawLimit, offset: rawOffset } = req.query as Record<string, string | undefined>;
            const limit = Math.min(parseInt(rawLimit || '50', 10) || 50, 200);
            const offset = parseInt(rawOffset || '0', 10) || 0;

            const where: any = { company_id: req.user.companyId };

            if (category && category !== 'ALL') {
                where.category = category;
            }

            if (search && search.trim()) {
                const term = search.trim();
                where.OR = [
                    { name: { contains: term, mode: 'insensitive' } },
                    { description: { contains: term, mode: 'insensitive' } },
                    { file_name: { contains: term, mode: 'insensitive' } },
                ];
            }

            const [total, documents] = await Promise.all([
                prisma.companyDocument.count({ where }),
                prisma.companyDocument.findMany({
                    where,
                    orderBy: { created_at: 'desc' },
                    take: limit,
                    skip: offset,
                }),
            ]);

            const mapped = documents.map((doc) => ({
                id: doc.id,
                name: doc.name,
                description: doc.description,
                category: doc.category,
                fileUrl: doc.file_url,
                fileName: doc.file_name,
                fileSize: doc.file_size,
                mimeType: doc.mime_type,
                uploadedBy: doc.uploaded_by,
                tags: doc.tags,
                createdAt: doc.created_at,
                updatedAt: doc.updated_at,
            }));

            return this.sendSuccess(res, { documents: mapped, total, limit, offset });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * POST /api/document-hub
     * Upload a new document (multipart form with field 'file').
     */
    upload = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) throw new Error('Unauthorized');

            const file = (req as any).file as Express.Multer.File | undefined;
            if (!file) {
                return this.sendError(res, new Error('No file provided'), 400);
            }

            const { name, description, category, tags } = req.body;
            const docName = name || file.originalname;
            const docCategory = category || 'OTHER';

            // Save file to disk
            const ext = path.extname(file.originalname);
            const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
            const filePath = path.join(UPLOAD_DIR, safeFileName);
            fs.writeFileSync(filePath, file.buffer);

            // Build a relative URL (the backend serves /uploads statically)
            const fileUrl = `/uploads/documents/${safeFileName}`;

            const parsedTags: string[] = tags ? (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : tags) : [];

            const doc = await prisma.companyDocument.create({
                data: {
                    company_id: req.user.companyId,
                    name: docName,
                    description: description || null,
                    category: docCategory,
                    file_url: fileUrl,
                    file_name: file.originalname,
                    file_size: file.size,
                    mime_type: file.mimetype,
                    uploaded_by: req.user.id,
                    tags: parsedTags,
                },
            });

            return this.sendSuccess(res, {
                document: {
                    id: doc.id,
                    name: doc.name,
                    description: doc.description,
                    category: doc.category,
                    fileUrl: doc.file_url,
                    fileName: doc.file_name,
                    fileSize: doc.file_size,
                    mimeType: doc.mime_type,
                    uploadedBy: doc.uploaded_by,
                    tags: doc.tags,
                    createdAt: doc.created_at,
                    updatedAt: doc.updated_at,
                },
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * DELETE /api/document-hub/:id
     * Delete a document owned by this company.
     */
    remove = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) throw new Error('Unauthorized');

            const { id } = req.params;

            const doc = await prisma.companyDocument.findFirst({
                where: { id, company_id: req.user.companyId },
            });

            if (!doc) {
                return this.sendError(res, new Error('Document not found'), 404);
            }

            // Delete file from disk
            if (doc.file_url) {
                const filePath = path.join(process.cwd(), doc.file_url);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            await prisma.companyDocument.delete({ where: { id } });

            return this.sendSuccess(res, { message: 'Document deleted' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
