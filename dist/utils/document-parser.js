"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentParser = void 0;
const axios_1 = __importDefault(require("axios"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
class DocumentParser {
    /**
     * Parse document content from URL
     */
    static async parseFromUrl(url) {
        try {
            // Fetch file
            const response = await axios_1.default.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            // Determine type from URL or header?
            // Simple heuristic: check extension
            const lowerUrl = url.toLowerCase();
            if (lowerUrl.includes('.pdf') || (response.headers['content-type'] === 'application/pdf')) {
                return this.parsePdf(buffer);
            }
            else if (lowerUrl.includes('.docx') || lowerUrl.includes('.doc') ||
                response.headers['content-type']?.includes('word')) {
                return this.parseDocx(buffer);
            }
            // Fallback: try PDF then docx if unsure? 
            // Or just return empty string if unknown
            return '';
        }
        catch (error) {
            console.error('Error parsing document:', error);
            return '';
        }
    }
    static async parsePdf(buffer) {
        try {
            const data = await (0, pdf_parse_1.default)(buffer);
            return data.text;
        }
        catch (e) {
            console.error('PDF Parse Error:', e);
            return '';
        }
    }
    static async parseDocx(buffer) {
        try {
            const result = await mammoth_1.default.extractRawText({ buffer });
            return result.value;
        }
        catch (e) {
            console.error('Docx Parse Error:', e);
            return '';
        }
    }
}
exports.DocumentParser = DocumentParser;
