import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { documentParserService } from '../ai/document-parser.service';
import { jobDescriptionExtractorService } from '../ai/job-description-extractor.service';
import { AuthenticatedRequest } from '../../types';

export class JobDocumentController extends BaseController {
    constructor() {
        super('job-document-controller');
    }

    /**
     * Parse and extract job details from uploaded document
     * POST /api/jobs/parse-document
     */
    parseDocument = async (req: AuthenticatedRequest, res: Response) => {
        if (!req.file) {
            return this.sendError(res, new Error('No file uploaded'), 400);
        }

        try {
            // Step 1: Parse document
            const parsed = await documentParserService.parseDocument(req.file);

            // Step 2: Extract job details with AI
            const extracted = await jobDescriptionExtractorService.extractWithAI(parsed.text);

            return this.sendSuccess(res, {
                extractedText: parsed.text.substring(0, 1000), // Preview
                extractedData: extracted
            });
        } catch (error: any) {
            return this.sendError(res, error);
        }
    }
}

export const jobDocumentController = new JobDocumentController();
