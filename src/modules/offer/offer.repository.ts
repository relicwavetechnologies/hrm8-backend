import { BaseRepository } from '../../core/repository';
import { Prisma, OfferLetter, OfferNegotiation, OfferDocument } from '@prisma/client';

export class OfferRepository extends BaseRepository {
    /**
     * Create a new offer letter
     */
    async create(data: Prisma.OfferLetterCreateInput): Promise<OfferLetter> {
        return this.prisma.offerLetter.create({
            data,
        });
    }

    /**
     * Update an offer letter
     */
    async update(id: string, data: Prisma.OfferLetterUpdateInput): Promise<OfferLetter> {
        return this.prisma.offerLetter.update({
            where: { id },
            data,
        });
    }

    /**
     * Find by ID
     */
    async findById(id: string) {
        return this.prisma.offerLetter.findUnique({
            where: { id },
            include: {
                application: {
                    select: { id: true, status: true }
                },
                candidate: {
                    select: { id: true, first_name: true, last_name: true, email: true }
                },
                job: {
                    select: {
                        id: true,
                        title: true,
                        company: {
                            select: { id: true, name: true }
                        }
                    }
                },
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }

    /**
     * Find by Application ID
     */
    async findByApplicationId(applicationId: string): Promise<OfferLetter[]> {
        return this.prisma.offerLetter.findMany({
            where: { application_id: applicationId },
            orderBy: { created_at: 'desc' }
        });
    }

    /**
     * Find by Job ID (e.g. all offers for a job)
     */
    async findByJobId(jobId: string): Promise<OfferLetter[]> {
        return this.prisma.offerLetter.findMany({
            where: { job_id: jobId },
            include: {
                candidate: {
                    select: { first_name: true, last_name: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    /**
     * Create Negotiation
     */
    async createNegotiation(data: Prisma.OfferNegotiationCreateInput): Promise<OfferNegotiation> {
        return this.prisma.offerNegotiation.create({ data });
    }

    /**
     * Find negotiation history for an offer
     */
    async findNegotiationsByOfferId(offerId: string): Promise<OfferNegotiation[]> {
        return this.prisma.offerNegotiation.findMany({
            where: { offer_id: offerId },
            orderBy: { created_at: 'asc' }
        });
    }

    /**
     * Find Specific Negotiation
     */
    async findNegotiationById(id: string): Promise<OfferNegotiation | null> {
        return this.prisma.offerNegotiation.findUnique({ where: { id } });
    }

    /**
     * Update Negotiation
     */
    async updateNegotiation(id: string, data: Prisma.OfferNegotiationUpdateInput): Promise<OfferNegotiation> {
        return this.prisma.offerNegotiation.update({
            where: { id },
            data
        });
    }

    /**
     * Create Document Request
     */
    async createDocument(data: Prisma.OfferDocumentCreateInput): Promise<OfferDocument> {
        return this.prisma.offerDocument.create({ data });
    }

    /**
     * Find Documents for an offer
     */
    async findDocumentsByOfferId(offerId: string): Promise<OfferDocument[]> {
        return this.prisma.offerDocument.findMany({
            where: { offer_id: offerId },
            orderBy: { created_at: 'asc' }
        });
    }

    /**
     * Find Document by ID
     */
    async findDocumentById(id: string): Promise<OfferDocument | null> {
        return this.prisma.offerDocument.findUnique({ where: { id } });
    }

    /**
     * Update Document
     */
    async updateDocument(id: string, data: Prisma.OfferDocumentUpdateInput): Promise<OfferDocument> {
        return this.prisma.offerDocument.update({
            where: { id },
            data
        });
    }

    /**
     * Check if all required documents are approved
     */
    async areAllRequiredDocumentsApproved(offerId: string): Promise<boolean> {
        const requiredDocs = await this.prisma.offerDocument.findMany({
            where: {
                offer_id: offerId,
                is_required: true,
            },
        });

        if (requiredDocs.length === 0) return true;

        const allApproved = requiredDocs.every((doc) => doc.status === 'APPROVED');
        return allApproved;
    }
}
