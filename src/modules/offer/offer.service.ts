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
        offer_type: data.offerType || 'full-time',
        salary: data.salary ?? 0,
        salary_currency: data.salaryCurrency || 'USD',
        salary_period: data.salaryPeriod || 'annual',
        start_date: new Date(data.startDate),
        benefits: Array.isArray(data.benefits) ? data.benefits : (typeof data.benefits === 'string' ? data.benefits.split(',').map((b: string) => b.trim()) : []),
        bonus_structure: data.bonusStructure,
        equity_options: data.equityOptions,
        work_location: data.workLocation ?? '',
        work_arrangement: data.workArrangement ?? 'remote',
        probation_period: data.probationPeriod,
        vacation_days: data.vacationDays,
        custom_terms: data.customTerms,
        expiry_date: data.expiryDate ? new Date(data.expiryDate) : undefined,
        custom_message: data.customMessage,
        template_id: data.templateId || null,
        status: 'DRAFT',
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

  static async initiateNegotiation(offerId: string, candidateId: string, data: any) {
    const offer = await prisma.offerLetter.findUnique({
      where: { id: offerId },
      include: { candidate: true, job: { include: { company: true } } }
    });
    if (!offer) throw new Error('Offer not found');
    if (offer.candidate_id !== candidateId) throw new Error('Unauthorized');

    const negotiation = await prisma.offerNegotiation.create({
      data: {
        offer_id: offerId,
        message_type: data.messageType || 'COUNTER_OFFER',
        message: data.message,
        proposed_changes: data.proposedChanges || null,
        sender_id: candidateId,
        sender_type: 'CANDIDATE',
        sender_name: data.senderName || 'Candidate',
        sender_email: data.senderEmail || null,
        responded: false,
      },
    });

    return negotiation;
  }

  static async respondToNegotiation(negotiationId: string, candidateId: string, response: string) {
    const negotiation = await prisma.offerNegotiation.findUnique({
      where: { id: negotiationId },
      include: { offer_letter: true },
    });

    if (!negotiation) throw new Error('Negotiation not found');
    if (negotiation.offer_letter.candidate_id !== candidateId) throw new Error('Unauthorized');

    return prisma.offerNegotiation.update({
      where: { id: negotiationId },
      data: {
        responded: true,
        response: response,
        response_date: new Date(),
      },
    });
  }

  static async uploadDocument(offerId: string, candidateId: string, data: any) {
    const offer = await prisma.offerLetter.findUnique({ where: { id: offerId } });
    if (!offer) throw new Error('Offer not found');
    if (offer.candidate_id !== candidateId) throw new Error('Unauthorized');

    const document = await prisma.offerDocument.create({
      data: {
        offer_id: offerId,
        application_id: offer.application_id,
        name: data.name,
        description: data.description || null,
        category: data.category || 'OTHER',
        status: 'PENDING',
        file_url: data.fileUrl,
        file_name: data.fileName,
        uploaded_date: new Date(),
        uploaded_by: candidateId,
        is_required: data.isRequired ?? true,
      },
    });

    return document;
  }

  static async getOfferDocuments(offerId: string, candidateId: string) {
    const offer = await prisma.offerLetter.findUnique({ where: { id: offerId } });
    if (!offer) throw new Error('Offer not found');
    if (offer.candidate_id !== candidateId) throw new Error('Unauthorized');

    return prisma.offerDocument.findMany({
      where: { offer_id: offerId },
      orderBy: { created_at: 'desc' },
    });
  }

  static async getNegotiations(offerId: string, candidateId: string) {
    const offer = await prisma.offerLetter.findUnique({ where: { id: offerId } });
    if (!offer) throw new Error('Offer not found');
    if (offer.candidate_id !== candidateId) throw new Error('Unauthorized');

    return prisma.offerNegotiation.findMany({
      where: { offer_id: offerId },
      orderBy: { created_at: 'desc' },
    });
  }
}
