"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentParserService = void 0;
const mammoth_1 = __importDefault(require("mammoth"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
class DocumentParserService {
    /**
     * Parse PDF document
     */
    static async parsePDF(buffer) {
        try {
            const data = await (0, pdf_parse_1.default)(buffer);
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
        }
        catch (error) {
            console.error('[DocumentParserService] PDF parsing failed:', error);
            throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Parse DOCX document
     */
    static async parseDOCX(buffer) {
        try {
            const result = await mammoth_1.default.extractRawText({ buffer });
            const text = result.value;
            return {
                text,
                metadata: {
                    wordCount: text.split(/\s+/).length,
                },
            };
        }
        catch (error) {
            throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Parse TXT document
     */
    static async parseTXT(buffer) {
        try {
            const text = buffer.toString('utf-8');
            return {
                text,
                metadata: {
                    wordCount: text.split(/\s+/).length,
                },
            };
        }
        catch (error) {
            throw new Error(`Failed to parse TXT: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Parse document based on MIME type
     */
    static async parseDocument(file) {
        const mimeType = file.mimetype;
        const buffer = file.buffer;
        if (!buffer || buffer.length === 0) {
            throw new Error('File buffer is empty');
        }
        // Helper to check magic bytes
        const isPDF = (buf) => buf.length > 4 && buf.slice(0, 4).toString() === '%PDF';
        const isDOCX = (buf) => buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4B;
        if (mimeType === 'application/pdf' || isPDF(buffer)) {
            return this.parsePDF(buffer);
        }
        else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword' ||
            isDOCX(buffer)) {
            return this.parseDOCX(buffer);
        }
        else if (mimeType === 'text/plain') {
            return this.parseTXT(buffer);
        }
        else if (mimeType === 'application/octet-stream') {
            throw new Error(`Unsupported file type: ${mimeType} (signature unknown). Supported types: PDF, DOCX, DOC, TXT`);
        }
        else {
            throw new Error(`Unsupported file type: ${mimeType}. Supported types: PDF, DOCX, DOC, TXT`);
        }
    }
}
exports.DocumentParserService = DocumentParserService;
