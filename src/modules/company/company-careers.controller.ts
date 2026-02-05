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
            if (!req.user?.companyId) return this.sendError(res, new Error('Unauthorized'), 401);

            // Assuming careers config is part of company profile for now
            const company = await this.repo.findById(req.user.companyId as string);

            // Return subset of fields related to careers
            return this.sendSuccess(res, {
                careers_page_url: `${env.FRONTEND_URL}/careers/${company?.id}`,
                careers_page_status: company?.careers_page_status,
                careers_pending_changes: company?.careers_pending_changes,
                careers_review_notes: company?.careers_review_notes,
                about: company?.careers_page_about,
                banner_url: company?.careers_page_banner,
                logo_url: company?.careers_page_logo,
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
            if (!req.user?.companyId) return this.sendError(res, new Error('Unauthorized'), 401);

            const pendingChanges = {
                about: req.body.about,
                logo_url: req.body.logo_url ?? req.body.logo,
                banner_url: req.body.banner_url ?? req.body.banner,
                social: req.body.social
            };

            const updated = await this.repo.update(req.user.companyId as string, {
                careers_pending_changes: pendingChanges,
                careers_page_status: 'PENDING',
                careers_review_notes: null
            });

            return this.sendSuccess(res, updated, 'Careers page changes submitted for approval');
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
