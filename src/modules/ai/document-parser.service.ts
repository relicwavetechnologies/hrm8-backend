import mammoth from 'mammoth';
import { BaseService } from '../../core/service';
// pdf-parse version in package.json is 1.1.1
import pdf from 'pdf-parse';

export interface ParsedDocument {
    text: string;
    metadata?: {
        title?: string;
        author?: string;
        pages?: number;
        wordCount?: number;
    };
}

export class DocumentParserService extends BaseService {
    /**
     * Parse PDF document
     */
    async parsePDF(buffer: Buffer): Promise<ParsedDocument> {
        try {
            const data = await pdf(buffer);
            const text = data.text || '';

            return {
                text,
                metadata: {
                    title: data.info?.Title,
                    author: data.info?.Author,
                    pages: data.numpages || 0,
                    wordCount: text.split(/\s+/).length,
                },
            };
        } catch (error) {
            console.error('[DocumentParserService] PDF parsing failed:', error);
            throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Parse DOCX document
     */
    async parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
        try {
            const result = await mammoth.extractRawText({ buffer });
            const text = result.value;
            return {
                text,
                metadata: {
                    wordCount: text.split(/\s+/).length,
                },
            };
        } catch (error) {
            throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Parse TXT document
     */
    async parseTXT(buffer: Buffer): Promise<ParsedDocument> {
        try {
            const text = buffer.toString('utf-8');
            return {
                text,
                metadata: {
                    wordCount: text.split(/\s+/).length,
                },
            };
        } catch (error) {
            throw new Error(`Failed to parse TXT: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Parse document based on MIME type
     */
    async parseDocument(file: Express.Multer.File): Promise<ParsedDocument> {
        const mimeType = file.mimetype;
        const buffer = file.buffer;

        if (!buffer || buffer.length === 0) {
            throw new Error('File buffer is empty');
        }

        if (mimeType === 'application/pdf') {
            return this.parsePDF(buffer);
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword'
        ) {
            return this.parseDOCX(buffer);
        } else if (mimeType === 'text/plain') {
            return this.parseTXT(buffer);
        } else {
            // Fallback to extension check if mimetype is generic or unknown
            const ext = file.originalname.toLowerCase().split('.').pop();
            if (ext === 'pdf') return this.parsePDF(buffer);
            if (['docx', 'doc'].includes(ext || '')) return this.parseDOCX(buffer);
            if (ext === 'txt') return this.parseTXT(buffer);

            throw new Error(`Unsupported file type: ${mimeType}. Supported types: PDF, DOCX, DOC, TXT`);
        }
    }
}

export const documentParserService = new DocumentParserService();
