import { BaseRepository } from '../../core/repository';
import { Prisma, OfferLetter } from '@prisma/client';

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
                    select: { id: true, title: true }
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
}
