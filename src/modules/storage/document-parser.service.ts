import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export interface ParsedDocument {
  text: string;
  metadata?: {
    title?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
  };
}

export class DocumentParserService {
  /**
   * Parse PDF document
   */
  static async parsePDF(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const data = await pdfParse(buffer);
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
  static async parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
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
  static async parseTXT(buffer: Buffer): Promise<ParsedDocument> {
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
  static async parseDocument(file: { mimetype: string, buffer: Buffer }): Promise<ParsedDocument> {
    const mimeType = file.mimetype;
    const buffer = file.buffer;

    if (!buffer || buffer.length === 0) {
      throw new Error('File buffer is empty');
    }

    // Helper to check magic bytes
    const isPDF = (buf: Buffer) => buf.length > 4 && buf.slice(0, 4).toString() === '%PDF';
    const isDOCX = (buf: Buffer) => buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4B;

    if (mimeType === 'application/pdf' || isPDF(buffer)) {
      return this.parsePDF(buffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      isDOCX(buffer)
    ) {
      return this.parseDOCX(buffer);
    } else if (mimeType === 'text/plain') {
      return this.parseTXT(buffer);
    } else if (mimeType === 'application/octet-stream') {
      throw new Error(`Unsupported file type: ${mimeType} (signature unknown). Supported types: PDF, DOCX, DOC, TXT`);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}. Supported types: PDF, DOCX, DOC, TXT`);
    }
  }
}
