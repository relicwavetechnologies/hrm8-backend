
import { BaseService } from '../../core/service';
import { CareersRequestRepository } from './careers-request.repository';
import { HttpException } from '../../core/http-exception';
import { CareersPageStatus } from '@prisma/client';

export class CareersRequestService extends BaseService {
    constructor(private careersRequestRepository: CareersRequestRepository) {
        super();
    }

    async getRequests() {
        const companies = await this.careersRequestRepository.findMany({
            where: {
                careers_page_status: 'PENDING',
            },
            orderBy: { updated_at: 'desc' },
        });

        // Map Company to CareersRequest interface
        const requests = companies.map(company => {
            const pendingChanges = company.careers_pending_changes as any || {};

            return {
                id: company.id, // Using Company ID as Request ID since it's 1-to-1
                companyName: company.name,
                domain: company.domain,
                type: pendingChanges.type || 'SECTION_UPDATE', // Default or derived
                status: company.careers_page_status,
                pending: {
                    logoUrl: pendingChanges.logoUrl ?? company.careers_page_logo, // Fallback logic or exact mapping
                    bannerUrl: pendingChanges.bannerUrl ?? company.careers_page_banner,
                    about: pendingChanges.about ?? company.careers_page_about,
                    social: pendingChanges.social ?? company.careers_page_social,
                },
                current: {
                    logoUrl: company.careers_page_logo,
                    bannerUrl: company.careers_page_banner,
                    about: company.careers_page_about,
                    social: company.careers_page_social,
                },
                submittedAt: company.updated_at.toISOString(),
            };
        });

        return { requests, total: requests.length };
    }

    async approve(id: string, section?: string) {
        const company = await this.careersRequestRepository.findUnique(id);
        if (!company) throw new HttpException(404, 'Company not found');

        const pendingChanges = company.careers_pending_changes as any || {};

        // Apply changes
        const updateData: any = {
            careers_page_status: 'APPROVED',
            careers_pending_changes: {}, // Clear pending
        };

        if (pendingChanges.logoUrl) updateData.careers_page_logo = pendingChanges.logoUrl;
        if (pendingChanges.bannerUrl) updateData.careers_page_banner = pendingChanges.bannerUrl;
        if (pendingChanges.about) updateData.careers_page_about = pendingChanges.about;
        if (pendingChanges.social) updateData.careers_page_social = pendingChanges.social;

        // If partial approval (section), logic might need customization, 
        // but for now assuming full approval of pending changes.

        return this.careersRequestRepository.update(id, updateData);
    }

    async reject(id: string, reason: string) {
        const company = await this.careersRequestRepository.findUnique(id);
        if (!company) throw new HttpException(404, 'Company not found');

        return this.careersRequestRepository.update(id, {
            careers_page_status: 'REJECTED',
            careers_review_notes: { reason, rejectedAt: new Date() },
            // Keep pending changes so they can edit? Or clear? 
            // Usually keep so they can retry.
        });
    }
}
