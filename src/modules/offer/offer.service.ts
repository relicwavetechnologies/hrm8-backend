import { prisma } from '../../utils/prisma';
import { emailService } from '../email/email.service';
import { env } from '../../config/env';
import { CloudinaryService } from '../storage/cloudinary.service';
import { ApplicationActivityService } from '../application/application-activity.service';
import { PlacementCommissionService } from '../hrm8/placement-commission.service';

type WorkflowStepKey = 'negotiation' | 'amount' | 'offer_letter' | 'document_request' | 'documents' | 'hired';

interface OfferWorkflowState {
  currentStep: WorkflowStepKey;
  negotiationComplete: boolean;
  amount: string;
  offerLetterSent: boolean;
  documentRequestSent: boolean;
  stepNotes: Partial<Record<WorkflowStepKey, string>>;
  hiredAt?: string;
}

export class OfferService {
  private static computeCurrentStep(workflow: OfferWorkflowState, documentsCount: number): WorkflowStepKey {
    if (workflow.hiredAt) return 'hired';
    if (!workflow.negotiationComplete) return 'negotiation';
    if (!workflow.amount) return 'amount';
    if (!workflow.offerLetterSent) return 'offer_letter';
    if (!workflow.documentRequestSent) return 'document_request';
    if (documentsCount === 0) return 'documents';
    return 'documents';
  }

  private static workflowFromCustomTerms(customTerms: any, docsCount = 0): OfferWorkflowState {
    const base: OfferWorkflowState = {
      currentStep: 'negotiation',
      negotiationComplete: false,
      amount: '',
      offerLetterSent: false,
      documentRequestSent: false,
      stepNotes: {},
    };
    const saved = customTerms?.workflow || {};
    const workflow: OfferWorkflowState = {
      currentStep: (saved.currentStep || base.currentStep) as WorkflowStepKey,
      negotiationComplete: Boolean(saved.negotiationComplete),
      amount: String(saved.amount || ''),
      offerLetterSent: Boolean(saved.offerLetterSent),
      documentRequestSent: Boolean(saved.documentRequestSent),
      stepNotes: typeof saved.stepNotes === 'object' && saved.stepNotes ? saved.stepNotes : {},
      hiredAt: saved.hiredAt || undefined,
    };
    workflow.currentStep = this.computeCurrentStep(workflow, docsCount);
    return workflow;
  }

  private static withWorkflowInCustomTerms(existing: any, workflow: OfferWorkflowState) {
    return {
      ...(existing && typeof existing === 'object' ? existing : {}),
      workflow,
    };
  }

  private static async appendApplicationNote(applicationId: string, actorId: string, content: string) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { recruiter_notes: true },
    });
    if (!app) return;

    let notes: any[] = [];
    try {
      if (app.recruiter_notes) {
        const parsed = typeof app.recruiter_notes === 'string'
          ? JSON.parse(app.recruiter_notes)
          : app.recruiter_notes;
        notes = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      notes = [];
    }

    const user = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, name: true, email: true },
    });

    notes.push({
      id: crypto.randomUUID(),
      content,
      mentions: [],
      createdAt: new Date().toISOString(),
      author: {
        id: actorId,
        name: user?.name || 'Unknown',
        email: user?.email || '',
      },
    });

    await prisma.application.update({
      where: { id: applicationId },
      data: { recruiter_notes: JSON.stringify(notes) },
    });
  }

  private static async ensureOfferForApplication(applicationId: string, actorId: string) {
    const existing = await prisma.offerLetter.findFirst({
      where: { application_id: applicationId },
      orderBy: { created_at: 'desc' },
    });
    if (existing) return existing;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        job: true,
      },
    });
    if (!application || !application.candidate || !application.job) {
      throw new Error('Application data incomplete');
    }

    return prisma.offerLetter.create({
      data: {
        application_id: applicationId,
        candidate_id: application.candidate_id,
        job_id: application.job_id,
        created_by: actorId,
        offer_type: 'full-time',
        salary: 0,
        salary_currency: 'USD',
        salary_period: 'annual',
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        benefits: [],
        work_location: '',
        work_arrangement: 'remote',
        status: 'DRAFT',
      },
    });
  }

  static async getWorkflowByApplication(applicationId: string, actorId: string) {
    const offer = await this.ensureOfferForApplication(applicationId, actorId);
    const docs = await prisma.offerDocument.findMany({
      where: { offer_id: offer.id },
      orderBy: { created_at: 'desc' },
    });
    const workflow = this.workflowFromCustomTerms(offer.custom_terms, docs.length);

    return {
      offerId: offer.id,
      applicationId,
      workflow,
      documents: docs,
    };
  }

  static async updateWorkflowByApplication(
    applicationId: string,
    actorId: string,
    data: {
      negotiationComplete?: boolean;
      amount?: string;
      offerLetterSent?: boolean;
      documentRequestSent?: boolean;
      step?: WorkflowStepKey;
      note?: string;
      markHired?: boolean;
    },
  ) {
    const offer = await this.ensureOfferForApplication(applicationId, actorId);
    const docsCount = await prisma.offerDocument.count({ where: { offer_id: offer.id } });
    const current = this.workflowFromCustomTerms(offer.custom_terms, docsCount);

    const next: OfferWorkflowState = {
      ...current,
      negotiationComplete: data.negotiationComplete ?? current.negotiationComplete,
      amount: data.amount !== undefined ? String(data.amount || '') : current.amount,
      offerLetterSent: data.offerLetterSent ?? current.offerLetterSent,
      documentRequestSent: data.documentRequestSent ?? current.documentRequestSent,
      stepNotes: { ...current.stepNotes },
      hiredAt: current.hiredAt,
      currentStep: current.currentStep,
    };

    if (data.step && data.note) {
      next.stepNotes[data.step] = data.note;
      await this.appendApplicationNote(applicationId, actorId, `[Offer ${data.step}] ${data.note}`);
      await ApplicationActivityService.logSafe({
        applicationId,
        actorId,
        action: 'note_added',
        subject: `Offer ${data.step} note added`,
        description: data.note.slice(0, 220),
        metadata: { offerId: offer.id, step: data.step },
      });
    }

    if (data.markHired) {
      next.hiredAt = new Date().toISOString();
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: 'HIRED',
          stage: 'OFFER_ACCEPTED',
        },
      });
      await ApplicationActivityService.logSafe({
        applicationId,
        actorId,
        action: 'stage_changed',
        subject: 'Candidate marked hired from offer workflow',
        description: 'Offer workflow completed and candidate moved to hired',
        metadata: { offerId: offer.id },
      });

      try {
        const result = await PlacementCommissionService.createForHiredApplication(applicationId);
        if (result.created) {
          console.log(`[OfferService] Placement commission ${result.commissionId} created for application ${applicationId}`);
        }
      } catch (err) {
        console.error(`[OfferService] Failed to create placement commission for ${applicationId}:`, err);
      }
    }

    next.currentStep = this.computeCurrentStep(next, docsCount);

    const updated = await prisma.offerLetter.update({
      where: { id: offer.id },
      data: {
        custom_terms: this.withWorkflowInCustomTerms(offer.custom_terms, next) as any,
        salary: next.amount ? Number(String(next.amount).replace(/[^\d.]/g, '')) || offer.salary : offer.salary,
      },
    });

    await ApplicationActivityService.logSafe({
      applicationId,
      actorId,
      action: 'other',
      subject: 'Offer workflow updated',
      description: `Current step: ${next.currentStep}`,
      metadata: {
        offerId: offer.id,
        workflow: next,
      },
    });

    const docs = await prisma.offerDocument.findMany({
      where: { offer_id: offer.id },
      orderBy: { created_at: 'desc' },
    });

    return {
      offerId: updated.id,
      applicationId,
      workflow: next,
      documents: docs,
    };
  }

  static async uploadWorkflowDocuments(
    applicationId: string,
    actorId: string,
    files: Express.Multer.File[] = [],
    category: string = 'OTHER',
    note?: string,
  ) {
    if (!files.length) {
      throw new Error('No files uploaded');
    }
    const offer = await this.ensureOfferForApplication(applicationId, actorId);
    const createdDocs: any[] = [];

    for (const file of files) {
      const uploadResult = await CloudinaryService.uploadMulterFile(file, {
        folder: `offer-workflow/${applicationId}`,
        resourceType: 'raw',
      });

      const doc = await prisma.offerDocument.create({
        data: {
          offer_id: offer.id,
          application_id: applicationId,
          name: file.originalname,
          category: (category as any) || 'OTHER',
          status: 'PENDING',
          file_url: uploadResult.secureUrl,
          file_name: file.originalname,
          uploaded_date: new Date(),
          uploaded_by: actorId,
          is_required: false,
        },
      });
      createdDocs.push(doc);
    }

    if (note) {
      await this.appendApplicationNote(applicationId, actorId, `[Offer documents] ${note}`);
    }

    await ApplicationActivityService.logSafe({
      applicationId,
      actorId,
      action: 'other',
      subject: 'Offer documents uploaded',
      description: `${createdDocs.length} document(s) uploaded`,
      metadata: {
        offerId: offer.id,
        files: createdDocs.map((d) => ({ id: d.id, name: d.file_name, url: d.file_url })),
      },
    });

    const docs = await prisma.offerDocument.findMany({
      where: { offer_id: offer.id },
      orderBy: { created_at: 'desc' },
    });
    const workflow = this.workflowFromCustomTerms(offer.custom_terms, docs.length);
    workflow.currentStep = this.computeCurrentStep(workflow, docs.length);
    await prisma.offerLetter.update({
      where: { id: offer.id },
      data: { custom_terms: this.withWorkflowInCustomTerms(offer.custom_terms, workflow) as any },
    });

    return {
      offerId: offer.id,
      applicationId,
      workflow,
      documents: docs,
    };
  }

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
