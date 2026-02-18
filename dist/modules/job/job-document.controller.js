"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobDocumentController = exports.JobDocumentController = void 0;
const controller_1 = require("../../core/controller");
const document_parser_service_1 = require("../ai/document-parser.service");
const job_description_extractor_service_1 = require("../ai/job-description-extractor.service");
class JobDocumentController extends controller_1.BaseController {
    constructor() {
        super('job-document-controller');
        /**
         * Parse and extract job details from uploaded document
         * POST /api/jobs/parse-document
         */
        this.parseDocument = async (req, res) => {
            if (!req.file) {
                return this.sendError(res, new Error('No file uploaded'), 400);
            }
            try {
                // Step 1: Parse document
                const parsed = await document_parser_service_1.documentParserService.parseDocument(req.file);
                // Step 2: Extract job details with AI
                const extracted = await job_description_extractor_service_1.jobDescriptionExtractorService.extractWithAI(parsed.text);
                return this.sendSuccess(res, {
                    extractedText: parsed.text.substring(0, 1000), // Preview
                    extractedData: extracted
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.JobDocumentController = JobDocumentController;
exports.jobDocumentController = new JobDocumentController();
