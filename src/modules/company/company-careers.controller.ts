import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AuthenticatedRequest } from '../../types';
import { CompanyRepository } from './company.repository';
import { env } from '../../config/env';
// Using CompanyRepository for now as Careers content is often on Company model
// If migrated to separate model, use dedicated repo.

export class CompanyCareersController extends BaseController {
    // Reusing existing repository pattern as Careers usually modifies company profile fields
    // like 'careers_page_url', 'branding', etc.
    // If strict separation needed, inject a CompanyCareersService.
    private repo: CompanyRepository;

    constructor() {
        super('company-careers');
        this.repo = new CompanyRepository();
    }

    /**
     * Get Careers Page Configuration
     */
    getCareersPage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'));

            // Assuming careers config is part of company profile for now
            const company = await this.repo.findById(req.user.companyId);

            // Return subset of fields related to careers
            return this.sendSuccess(res, {
                careersPageUrl: `${env.FRONTEND_URL}/careers/${company?.id}`,
                about: company?.careers_page_about,
                banner: company?.careers_page_banner,
                logo: company?.careers_page_logo,
                social: company?.careers_page_social
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Update Careers Page Configuration
     */
    updateCareersPage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return this.sendError(res, new Error('Unauthorized'));

            const updated = await this.repo.update(req.user.companyId, {
                careers_page_about: req.body.about,
                careers_page_logo: req.body.logo,
                careers_page_banner: req.body.banner,
                careers_page_social: req.body.social
            });

            return this.sendSuccess(res, updated, 'Careers page updated');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * Upload Careers Image
     * (Placeholder for actual implementation using upload service)
     */
    uploadCareersImage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // Integrate with upload service here
            return this.sendSuccess(res, { url: 'https://placeholder.com/image.png' }, 'Image uploaded');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
