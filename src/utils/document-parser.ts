
import axios from 'axios';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export class DocumentParser {
    /**
     * Parse document content from URL
     */
    static async parseFromUrl(url: string): Promise<string> {
        try {
            // Fetch file
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);

            // Determine type from URL or header?
            // Simple heuristic: check extension
            const lowerUrl = url.toLowerCase();

            if (lowerUrl.includes('.pdf') || (response.headers['content-type'] === 'application/pdf')) {
                return this.parsePdf(buffer);
            } else if (lowerUrl.includes('.docx') || lowerUrl.includes('.doc') ||
                response.headers['content-type']?.includes('word')) {
                return this.parseDocx(buffer);
            }

            // Fallback: try PDF then docx if unsure? 
            // Or just return empty string if unknown
            return '';
        } catch (error) {
            console.error('Error parsing document:', error);
            return '';
        }
    }

    static async parsePdf(buffer: Buffer): Promise<string> {
        try {
            const data = await pdf(buffer);
            return data.text;
        } catch (e) {
            console.error('PDF Parse Error:', e);
            return '';
        }
    }

    static async parseDocx(buffer: Buffer): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } catch (e) {
            console.error('Docx Parse Error:', e);
            return '';
        }
    }
}
