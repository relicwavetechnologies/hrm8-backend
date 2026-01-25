import { prisma } from '../../utils/prisma';
import { emailService } from '../email/email.service';
import { env } from '../../config/env';

export class OfferService {
  static async createOffer(data: any, createdBy: string) {
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: { candidate: true, job: true }
    });

    if (!application || !application.candidate || !application.job) {
      throw new Error('Application data incomplete');
    }

    const offer = await prisma.offerLetter.create({
      data: {
        application_id: data.applicationId,
        candidate_id: application.candidate_id,
        job_id: application.job_id,
        created_by: createdBy,
        offer_type: data.offerType,
        salary: data.salary,
        salary_currency: data.salaryCurrency || 'USD',
        salary_period: data.salaryPeriod,
        start_date: new Date(data.startDate),
        benefits: data.benefits || [],
        bonus_structure: data.bonusStructure,
        equity_options: data.equityOptions,
        work_location: data.workLocation,
        work_arrangement: data.workArrangement,
        probation_period: data.probationPeriod,
        vacation_days: data.vacationDays,
        custom_terms: data.customTerms,
        expiry_date: data.expiryDate ? new Date(data.expiryDate) : undefined,
        custom_message: data.customMessage,
        status: 'DRAFT', // Default
        // job_round_id is not in OfferLetter model in schema? Check schema.
        // It has template_id, but not job_round_id directly?
        // Ah, schema has offer_document, offer_negotiation.
        // Let's check schema for OfferLetter fields again.
      }
    });

    return offer;
  }

  static async sendOffer(offerId: string) {
    const offer = await prisma.offerLetter.findUnique({
        where: { id: offerId },
        include: { candidate: true, job: { include: { company: true } } }
    });

    if (!offer) throw new Error('Offer not found');
    if (offer.status !== 'DRAFT' && offer.status !== 'APPROVED') {
        throw new Error('Invalid status');
    }

    // Update status
    const updated = await prisma.offerLetter.update({
        where: { id: offerId },
        data: {
            status: 'SENT',
            sent_date: new Date()
        }
    });

    // Move app stage
    await prisma.application.update({
        where: { id: offer.application_id },
        data: { stage: 'OFFER_EXTENDED' } // Ensure Enum matches
    });

    // Email
    if (offer.candidate && offer.job) {
        const offerUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/candidate/offers/${offer.id}`;
        await emailService.sendOfferEmail({
            to: offer.candidate.email,
            candidateName: `${offer.candidate.first_name} ${offer.candidate.last_name}`,
            jobTitle: offer.job.title,
            offerUrl,
            companyName: offer.job.company?.name,
            expiryDate: offer.expiry_date || undefined
        });
    }

    return updated;
  }

  static async getByApplication(applicationId: string) {
    return prisma.offerLetter.findMany({ where: { application_id: applicationId } });
  }

  static async getById(id: string) {
    return prisma.offerLetter.findUnique({
        where: { id },
        include: { candidate: true, job: true }
    });
  }

  static async updateOffer(id: string, data: any) {
    return prisma.offerLetter.update({ where: { id }, data });
  }

  static async acceptOffer(id: string, candidateId: string) {
    const offer = await prisma.offerLetter.findUnique({ where: { id } });
    if (!offer) throw new Error('Offer not found');
    if (offer.candidate_id !== candidateId) throw new Error('Unauthorized');

    const updated = await prisma.offerLetter.update({
        where: { id },
        data: {
            status: 'ACCEPTED',
            responded_date: new Date()
        },
        include: { candidate: true, job: true }
    });

    // Update Application
    await prisma.application.update({
        where: { id: offer.application_id },
        data: { stage: 'OFFER_ACCEPTED' }
    });

    // Email
    if (updated.candidate && updated.job) {
        await emailService.sendOfferAcceptedEmail({
            to: updated.candidate.email,
            candidateName: updated.candidate.first_name,
            jobTitle: updated.job.title,
            startDate: updated.start_date
        });
    }

    return updated;
  }

  static async declineOffer(id: string, candidateId: string, reason?: string) {
    const offer = await prisma.offerLetter.findUnique({ where: { id } });
    if (!offer) throw new Error('Offer not found');
    if (offer.candidate_id !== candidateId) throw new Error('Unauthorized');

    return prisma.offerLetter.update({
        where: { id },
        data: {
            status: 'DECLINED',
            responded_date: new Date(),
            decline_reason: reason
        }
    });
  }
}
