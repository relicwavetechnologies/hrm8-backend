import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AuthenticatedRequest } from '../../types';
import { prisma } from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { env } from '../../config/env';
import { getNotificationEmailTemplate } from '../email/templates/notification.templates';

const emailServiceInstance = new EmailService();

export class TalentPoolController extends BaseController {
    constructor() {
        super('talent-pool');
    }

    /**
     * GET /api/talent-pool/search
     * Search candidates in the talent pool. Returns candidates with a flag
     * indicating whether they have already applied to the given job.
     */
    search = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) throw new Error('Unauthorized');

            const {
                search,
                city,
                state,
                country,
                status,
                jobId,
                limit: rawLimit,
                offset: rawOffset,
            } = req.query as Record<string, string | undefined>;

            const limit = Math.min(parseInt(rawLimit || '20', 10) || 20, 100);
            const offset = parseInt(rawOffset || '0', 10) || 0;

            // Build WHERE clause
            const where: Prisma.CandidateWhereInput = {};

            // Filter by status (default to ACTIVE candidates only)
            if (status) {
                where.status = status as any;
            } else {
                where.status = 'ACTIVE';
            }

            // Location filters
            if (city) where.city = { contains: city, mode: 'insensitive' };
            if (state) where.state = { contains: state, mode: 'insensitive' };
            if (country) where.country = { contains: country, mode: 'insensitive' };

            // Search by name or email
            if (search && search.trim()) {
                const term = search.trim();
                where.OR = [
                    { first_name: { contains: term, mode: 'insensitive' } },
                    { last_name: { contains: term, mode: 'insensitive' } },
                    { email: { contains: term, mode: 'insensitive' } },
                ];
            }

            // Count + fetch in parallel
            const [total, candidates] = await Promise.all([
                prisma.candidate.count({ where }),
                prisma.candidate.findMany({
                    where,
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        phone: true,
                        photo: true,
                        linked_in_url: true,
                        city: true,
                        state: true,
                        country: true,
                        visa_status: true,
                        work_eligibility: true,
                        job_type_preference: true,
                        salary_preference: true,
                        relocation_willing: true,
                        remote_preference: true,
                        email_verified: true,
                        status: true,
                        created_at: true,
                        updated_at: true,
                        // Include applications for the given job to check hasApplied
                        ...(jobId
                            ? {
                                applications: {
                                    where: { job_id: jobId },
                                    select: { id: true },
                                },
                            }
                            : {}),
                    },
                    orderBy: { created_at: 'desc' },
                    take: limit,
                    skip: offset,
                }),
            ]);

            // Map to the shape the frontend expects
            const mapped = candidates.map((c: any) => ({
                id: c.id,
                email: c.email,
                firstName: c.first_name,
                lastName: c.last_name,
                phone: c.phone || undefined,
                photo: c.photo || undefined,
                linkedInUrl: c.linked_in_url || undefined,
                city: c.city || undefined,
                state: c.state || undefined,
                country: c.country || undefined,
                visaStatus: c.visa_status || undefined,
                workEligibility: c.work_eligibility || undefined,
                jobTypePreference: c.job_type_preference || [],
                salaryPreference: c.salary_preference || undefined,
                relocationWilling: c.relocation_willing || false,
                remotePreference: c.remote_preference || undefined,
                emailVerified: c.email_verified,
                status: c.status,
                createdAt: c.created_at,
                updatedAt: c.updated_at,
                hasApplied: jobId ? (c.applications?.length || 0) > 0 : false,
            }));

            return this.sendSuccess(res, { candidates: mapped, total, limit, offset });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    /**
     * POST /api/talent-pool/invite
     * Send a job invitation email to an email address.
     * Creates a JobInvitation record and dispatches the invitation email.
     */
    invite = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) throw new Error('Unauthorized');

            const { email, jobId } = req.body;

            if (!email || !jobId) {
                return this.sendError(res, new Error('email and jobId are required'), 400);
            }

            // Validate the job exists and belongs to this company
            const job = await prisma.job.findFirst({
                where: { id: jobId, company_id: req.user.companyId },
                select: {
                    id: true,
                    title: true,
                    company_id: true,
                    location: true,
                    employment_type: true,
                    work_arrangement: true,
                    company: { select: { name: true } },
                },
            });

            if (!job) {
                return this.sendError(res, new Error('Job not found'), 404);
            }

            // Check if an invitation already exists for this email + job
            const existingInvitation = await prisma.jobInvitation.findUnique({
                where: { job_id_email: { job_id: jobId, email } },
            });

            if (existingInvitation) {
                return res.status(409).json({
                    success: false,
                    error: 'An invitation has already been sent to this email for this job',
                    code: 'INVITATION_EXISTS',
                });
            }

            // Check if candidate already exists and has applied
            const existingCandidate = await prisma.candidate.findUnique({
                where: { email },
                select: {
                    id: true,
                    first_name: true,
                    applications: { where: { job_id: jobId }, select: { id: true } },
                },
            });

            if (existingCandidate && existingCandidate.applications.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'This candidate has already applied to this job',
                    code: 'ALREADY_APPLIED',
                });
            }

            // Create invitation token
            const crypto = await import('crypto');
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 14); // 14-day expiry

            const invitation = await prisma.jobInvitation.create({
                data: {
                    job_id: jobId,
                    candidate_id: existingCandidate?.id || null,
                    email,
                    token,
                    status: 'PENDING',
                    invited_by: req.user.id,
                    expires_at: expiresAt,
                },
            });

            // Build invitation URL with token so invited candidate can view the private job
            const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
            const invitationUrl = `${frontendUrl}/jobs/${jobId}?invitation=${token}`;
            const companyName = (job as any).company?.name || 'the company';
            const candidateName = existingCandidate?.first_name || email.split('@')[0];

            // Send the invitation email
            try {
                const emailHtml = getNotificationEmailTemplate({
                    title: `You're Invited to Apply: ${job.title}`,
                    message: `
                        <p>Hi ${candidateName},</p>
                        <p>You have been personally invited to apply for the <strong>${job.title}</strong> position at <strong>${companyName}</strong>.</p>
                        ${job.location ? `<p><strong>Location:</strong> ${job.location}</p>` : ''}
                        ${job.employment_type ? `<p><strong>Type:</strong> ${job.employment_type.replace(/_/g, ' ')}</p>` : ''}
                        <p>This is a private opportunity — you've been hand-picked as a potential match.</p>
                        <p><a href="${invitationUrl}" style="display:inline-block;padding:12px 24px;background-color:#6366f1;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">View Job & Apply</a></p>
                        <p style="font-size:12px;color:#888;">This invitation expires on ${expiresAt.toLocaleDateString()}. If you have trouble with the button above, copy and paste this link: ${invitationUrl}</p>
                        <p>Best regards,<br/>The ${companyName} Hiring Team</p>
                    `,
                    actionUrl: invitationUrl,
                });

                await (emailServiceInstance as any).sendEmail(email, `You're Invited: ${job.title} at ${companyName}`, emailHtml);
                this.logger.info('Job invitation email sent', { email, jobId, jobTitle: job.title });
            } catch (emailError) {
                // Don't fail the request if email fails — the DB record is created
                this.logger.error('Failed to send invitation email', { email, jobId, error: emailError });
            }

            return this.sendSuccess(res, {
                message: `Invitation sent to ${email} for ${job.title}`,
                invitationId: invitation.id,
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}

