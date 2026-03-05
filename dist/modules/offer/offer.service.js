"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferService = void 0;
const prisma_1 = require("../../utils/prisma");
const email_service_1 = require("../email/email.service");
const cloudinary_service_1 = require("../storage/cloudinary.service");
const application_activity_service_1 = require("../application/application-activity.service");
class OfferService {
    static computeCurrentStep(workflow, documentsCount) {
        if (workflow.hiredAt)
            return 'hired';
        if (!workflow.negotiationComplete)
            return 'negotiation';
        if (!workflow.amount)
            return 'amount';
        if (!workflow.offerLetterSent)
            return 'offer_letter';
        if (!workflow.documentRequestSent)
            return 'document_request';
        if (documentsCount === 0)
            return 'documents';
        return 'documents';
    }
    static workflowFromCustomTerms(customTerms, docsCount = 0) {
        const base = {
            currentStep: 'negotiation',
            negotiationComplete: false,
            amount: '',
            compensation: {},
            offerLetterSent: false,
            documentRequestSent: false,
            stepNotes: {},
        };
        const saved = customTerms?.workflow || {};
        const workflow = {
            currentStep: (saved.currentStep || base.currentStep),
            negotiationComplete: Boolean(saved.negotiationComplete),
            amount: String(saved.amount || ''),
            compensation: (typeof saved.compensation === 'object' && saved.compensation) ? saved.compensation : {},
            offerLetterSent: Boolean(saved.offerLetterSent),
            documentRequestSent: Boolean(saved.documentRequestSent),
            stepNotes: typeof saved.stepNotes === 'object' && saved.stepNotes ? saved.stepNotes : {},
            hiredAt: saved.hiredAt || undefined,
        };
        workflow.currentStep = this.computeCurrentStep(workflow, docsCount);
        return workflow;
    }
    static withWorkflowInCustomTerms(existing, workflow) {
        return {
            ...(existing && typeof existing === 'object' ? existing : {}),
            workflow,
        };
    }
    static async appendApplicationNote(applicationId, actorId, content) {
        const app = await prisma_1.prisma.application.findUnique({
            where: { id: applicationId },
            select: { recruiter_notes: true },
        });
        if (!app)
            return;
        let notes = [];
        try {
            if (app.recruiter_notes) {
                const parsed = typeof app.recruiter_notes === 'string'
                    ? JSON.parse(app.recruiter_notes)
                    : app.recruiter_notes;
                notes = Array.isArray(parsed) ? parsed : [];
            }
        }
        catch {
            notes = [];
        }
        const user = await prisma_1.prisma.user.findUnique({
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
        await prisma_1.prisma.application.update({
            where: { id: applicationId },
            data: { recruiter_notes: JSON.stringify(notes) },
        });
    }
    static async ensureOfferForApplication(applicationId, actorId) {
        const existing = await prisma_1.prisma.offerLetter.findFirst({
            where: { application_id: applicationId },
            orderBy: { created_at: 'desc' },
        });
        if (existing)
            return existing;
        const application = await prisma_1.prisma.application.findUnique({
            where: { id: applicationId },
            include: {
                candidate: true,
                job: true,
            },
        });
        if (!application || !application.candidate || !application.job) {
            throw new Error('Application data incomplete');
        }
        return prisma_1.prisma.offerLetter.create({
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
    static async getWorkflowByApplication(applicationId, actorId) {
        const offer = await this.ensureOfferForApplication(applicationId, actorId);
        const docs = await prisma_1.prisma.offerDocument.findMany({
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
    static async updateWorkflowByApplication(applicationId, actorId, data) {
        const offer = await this.ensureOfferForApplication(applicationId, actorId);
        const docsCount = await prisma_1.prisma.offerDocument.count({ where: { offer_id: offer.id } });
        const current = this.workflowFromCustomTerms(offer.custom_terms, docsCount);
        const next = {
            ...current,
            negotiationComplete: data.negotiationComplete ?? current.negotiationComplete,
            amount: data.amount !== undefined ? String(data.amount || '') : current.amount,
            compensation: data.compensation !== undefined ? { ...(current.compensation || {}), ...data.compensation } : current.compensation,
            offerLetterSent: data.offerLetterSent ?? current.offerLetterSent,
            documentRequestSent: data.documentRequestSent ?? current.documentRequestSent,
            stepNotes: { ...current.stepNotes },
            hiredAt: current.hiredAt,
            currentStep: current.currentStep,
        };
        if (data.step && data.note) {
            next.stepNotes[data.step] = data.note;
            await this.appendApplicationNote(applicationId, actorId, `[Offer ${data.step}] ${data.note}`);
            await application_activity_service_1.ApplicationActivityService.logSafe({
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
            await prisma_1.prisma.application.update({
                where: { id: applicationId },
                data: {
                    status: 'HIRED',
                    stage: 'OFFER_ACCEPTED',
                },
            });
            await application_activity_service_1.ApplicationActivityService.logSafe({
                applicationId,
                actorId,
                action: 'stage_changed',
                subject: 'Candidate marked hired from offer workflow',
                description: 'Offer workflow completed and candidate moved to hired',
                metadata: { offerId: offer.id },
            });
        }
        next.currentStep = this.computeCurrentStep(next, docsCount);
        const updated = await prisma_1.prisma.offerLetter.update({
            where: { id: offer.id },
            data: {
                custom_terms: this.withWorkflowInCustomTerms(offer.custom_terms, next),
                salary: next.amount ? Number(String(next.amount).replace(/[^\d.]/g, '')) || offer.salary : offer.salary,
            },
        });
        await application_activity_service_1.ApplicationActivityService.logSafe({
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
        const docs = await prisma_1.prisma.offerDocument.findMany({
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
    static async uploadWorkflowDocuments(applicationId, actorId, files = [], category = 'OTHER', note) {
        if (!files.length) {
            throw new Error('No files uploaded');
        }
        const offer = await this.ensureOfferForApplication(applicationId, actorId);
        const createdDocs = [];
        for (const file of files) {
            const uploadResult = await cloudinary_service_1.CloudinaryService.uploadMulterFile(file, {
                folder: `offer-workflow/${applicationId}`,
                resourceType: 'raw',
            });
            const doc = await prisma_1.prisma.offerDocument.create({
                data: {
                    offer_id: offer.id,
                    application_id: applicationId,
                    name: file.originalname,
                    category: category || 'OTHER',
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
        await application_activity_service_1.ApplicationActivityService.logSafe({
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
        const docs = await prisma_1.prisma.offerDocument.findMany({
            where: { offer_id: offer.id },
            orderBy: { created_at: 'desc' },
        });
        const workflow = this.workflowFromCustomTerms(offer.custom_terms, docs.length);
        workflow.currentStep = this.computeCurrentStep(workflow, docs.length);
        await prisma_1.prisma.offerLetter.update({
            where: { id: offer.id },
            data: { custom_terms: this.withWorkflowInCustomTerms(offer.custom_terms, workflow) },
        });
        return {
            offerId: offer.id,
            applicationId,
            workflow,
            documents: docs,
        };
    }
    static async createOffer(data, createdBy) {
        const application = await prisma_1.prisma.application.findUnique({
            where: { id: data.applicationId },
            include: { candidate: true, job: true }
        });
        if (!application || !application.candidate || !application.job) {
            throw new Error('Application data incomplete');
        }
        const offer = await prisma_1.prisma.offerLetter.create({
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
                benefits: Array.isArray(data.benefits) ? data.benefits : (typeof data.benefits === 'string' ? data.benefits.split(',').map((b) => b.trim()) : []),
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
    static async sendOffer(offerId) {
        const offer = await prisma_1.prisma.offerLetter.findUnique({
            where: { id: offerId },
            include: { candidate: true, job: { include: { company: true } } }
        });
        if (!offer)
            throw new Error('Offer not found');
        if (offer.status !== 'DRAFT' && offer.status !== 'APPROVED') {
            throw new Error('Invalid status');
        }
        // Update status
        const updated = await prisma_1.prisma.offerLetter.update({
            where: { id: offerId },
            data: {
                status: 'SENT',
                sent_date: new Date()
            }
        });
        // Move app stage
        await prisma_1.prisma.application.update({
            where: { id: offer.application_id },
            data: { stage: 'OFFER_EXTENDED' } // Ensure Enum matches
        });
        // Email
        if (offer.candidate && offer.job) {
            const offerUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/candidate/offers/${offer.id}`;
            await email_service_1.emailService.sendOfferEmail({
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
    static async getByApplication(applicationId) {
        return prisma_1.prisma.offerLetter.findMany({ where: { application_id: applicationId } });
    }
    static async getById(id) {
        return prisma_1.prisma.offerLetter.findUnique({
            where: { id },
            include: { candidate: true, job: true }
        });
    }
    static async updateOffer(id, data) {
        return prisma_1.prisma.offerLetter.update({ where: { id }, data });
    }
    static async acceptOffer(id, candidateId) {
        const offer = await prisma_1.prisma.offerLetter.findUnique({ where: { id } });
        if (!offer)
            throw new Error('Offer not found');
        if (offer.candidate_id !== candidateId)
            throw new Error('Unauthorized');
        const updated = await prisma_1.prisma.offerLetter.update({
            where: { id },
            data: {
                status: 'ACCEPTED',
                responded_date: new Date()
            },
            include: { candidate: true, job: true }
        });
        // Update Application
        await prisma_1.prisma.application.update({
            where: { id: offer.application_id },
            data: { stage: 'OFFER_ACCEPTED' }
        });
        // Email
        if (updated.candidate && updated.job) {
            await email_service_1.emailService.sendOfferAcceptedEmail({
                to: updated.candidate.email,
                candidateName: updated.candidate.first_name,
                jobTitle: updated.job.title,
                startDate: updated.start_date
            });
        }
        return updated;
    }
    static async declineOffer(id, candidateId, reason) {
        const offer = await prisma_1.prisma.offerLetter.findUnique({ where: { id } });
        if (!offer)
            throw new Error('Offer not found');
        if (offer.candidate_id !== candidateId)
            throw new Error('Unauthorized');
        return prisma_1.prisma.offerLetter.update({
            where: { id },
            data: {
                status: 'DECLINED',
                responded_date: new Date(),
                decline_reason: reason
            }
        });
    }
    static async initiateNegotiation(offerId, candidateId, data) {
        const offer = await prisma_1.prisma.offerLetter.findUnique({
            where: { id: offerId },
            include: { candidate: true, job: { include: { company: true } } }
        });
        if (!offer)
            throw new Error('Offer not found');
        if (offer.candidate_id !== candidateId)
            throw new Error('Unauthorized');
        const negotiation = await prisma_1.prisma.offerNegotiation.create({
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
    static async respondToNegotiation(negotiationId, candidateId, response) {
        const negotiation = await prisma_1.prisma.offerNegotiation.findUnique({
            where: { id: negotiationId },
            include: { offer_letter: true },
        });
        if (!negotiation)
            throw new Error('Negotiation not found');
        if (negotiation.offer_letter.candidate_id !== candidateId)
            throw new Error('Unauthorized');
        return prisma_1.prisma.offerNegotiation.update({
            where: { id: negotiationId },
            data: {
                responded: true,
                response: response,
                response_date: new Date(),
            },
        });
    }
    static async uploadDocument(offerId, candidateId, data) {
        const offer = await prisma_1.prisma.offerLetter.findUnique({ where: { id: offerId } });
        if (!offer)
            throw new Error('Offer not found');
        if (offer.candidate_id !== candidateId)
            throw new Error('Unauthorized');
        const document = await prisma_1.prisma.offerDocument.create({
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
    static async getOfferDocuments(offerId, candidateId) {
        const offer = await prisma_1.prisma.offerLetter.findUnique({ where: { id: offerId } });
        if (!offer)
            throw new Error('Offer not found');
        if (offer.candidate_id !== candidateId)
            throw new Error('Unauthorized');
        return prisma_1.prisma.offerDocument.findMany({
            where: { offer_id: offerId },
            orderBy: { created_at: 'desc' },
        });
    }
    static async getNegotiations(offerId, candidateId) {
        const offer = await prisma_1.prisma.offerLetter.findUnique({ where: { id: offerId } });
        if (!offer)
            throw new Error('Offer not found');
        if (offer.candidate_id !== candidateId)
            throw new Error('Unauthorized');
        return prisma_1.prisma.offerNegotiation.findMany({
            where: { offer_id: offerId },
            orderBy: { created_at: 'desc' },
        });
    }
}
exports.OfferService = OfferService;
