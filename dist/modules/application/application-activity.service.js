"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationActivityService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../utils/prisma");
const openai_1 = __importDefault(require("openai"));
const KNOWN_ACTIONS = [
    'application_submitted',
    'application_created_manual',
    'application_created_talent_pool',
    'application_shortlisted',
    'application_unshortlisted',
    'application_withdrawn',
    'application_deleted',
    'application_marked_read',
    'score_updated',
    'rank_updated',
    'tags_updated',
    'manual_screening_updated',
    'evaluation_added',
    'ai_analysis_completed',
    'ai_analysis_failed',
    'round_changed',
    'stage_changed',
    'email_sent',
    'email_reply_sent',
    'sms_sent',
    'slack_message_sent',
    'call_logged',
    'task_created',
    'task_updated',
    'task_deleted',
    'task_assigned',
    'note_added',
    'notes_updated',
    'annotation_highlighted',
    'annotation_commented',
    'annotation_deleted',
    'assessment_invited',
    'assessment_started',
    'assessment_response_saved',
    'assessment_submitted',
    'assessment_resend',
    'assessment_graded',
    'assessment_vote_added',
    'assessment_comment_added',
    'assessment_finalized',
    'interview_scheduled',
    'interview_status_updated',
    'interview_updated',
    'interview_cancelled',
    'interview_feedback_added',
    'interview_note_added',
    'interview_note_deleted',
    'other',
];
class ApplicationActivityService {
    static async getAppContext(applicationId) {
        return prisma_1.prisma.application.findUnique({
            where: { id: applicationId },
            select: {
                id: true,
                job_id: true,
                candidate_id: true,
                candidate: {
                    select: {
                        first_name: true,
                        last_name: true,
                    },
                },
                job: {
                    select: {
                        title: true,
                        company_id: true,
                    },
                },
            },
        });
    }
    static mapToActivityType(action) {
        if (action.includes('email'))
            return client_1.ActivityType.EMAIL;
        if (action.includes('call'))
            return client_1.ActivityType.CALL;
        if (action.includes('interview'))
            return client_1.ActivityType.MEETING;
        if (action.includes('note') || action.includes('annotation'))
            return client_1.ActivityType.NOTE;
        if (action.includes('task') || action.includes('assessment'))
            return client_1.ActivityType.TASK;
        return client_1.ActivityType.FOLLOW_UP;
    }
    static normalizeKnownAction(eventName) {
        const normalized = eventName.trim().toLowerCase().replace(/\s+/g, '_');
        if (KNOWN_ACTIONS.includes(normalized)) {
            return normalized;
        }
        return null;
    }
    static async classifyUnknownEventWithAI(eventName, payload) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return {
                action: 'other',
                subject: eventName,
                description: `Event captured: ${eventName}`,
                tags: [`source:generic`, `raw_event:${eventName.toLowerCase().replace(/\s+/g, '_')}`],
            };
        }
        try {
            const openai = new openai_1.default({ apiKey });
            const response = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                temperature: 0,
                messages: [
                    {
                        role: 'system',
                        content: `You normalize ATS candidate events.
Return strict JSON with:
{
  "action": string,
  "subject": string,
  "description": string,
  "tags": string[]
}
Allowed action values: ${KNOWN_ACTIONS.join(', ')}.
If uncertain, use "other".
Keep subject <= 80 chars and description <= 220 chars.`,
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({ eventName, payload }),
                    },
                ],
            });
            const content = response.choices[0]?.message?.content;
            if (!content)
                throw new Error('Empty AI response');
            const parsed = JSON.parse(content);
            const action = (parsed.action && KNOWN_ACTIONS.includes(parsed.action))
                ? parsed.action
                : 'other';
            const subject = (parsed.subject || eventName || 'Event captured').slice(0, 80);
            const description = (parsed.description || `Event captured: ${eventName}`).slice(0, 220);
            const tags = Array.isArray(parsed.tags)
                ? parsed.tags.filter((t) => typeof t === 'string').slice(0, 10)
                : [];
            return { action, subject, description, tags };
        }
        catch (error) {
            console.error('[ApplicationActivityService] AI classification failed', error);
            return {
                action: 'other',
                subject: eventName,
                description: `Event captured: ${eventName}`,
                tags: [`source:generic`, `raw_event:${eventName.toLowerCase().replace(/\s+/g, '_')}`],
            };
        }
    }
    static async log(input) {
        const app = await this.getAppContext(input.applicationId);
        if (!app?.job?.company_id)
            return null;
        const candidateName = [app.candidate?.first_name, app.candidate?.last_name].filter(Boolean).join(' ').trim() || 'Candidate';
        const baseTags = [
            'scope:application',
            `application:${input.applicationId}`,
            `job:${app.job_id}`,
            `candidate:${app.candidate_id}`,
            `event:${input.action}`,
        ];
        return prisma_1.prisma.activity.create({
            data: {
                company_id: app.job.company_id,
                created_by: input.actorId || 'system',
                actor_type: input.actorType || (input.actorId ? client_1.ActorType.HRM8_USER : client_1.ActorType.SYSTEM),
                type: input.activityType || this.mapToActivityType(input.action),
                subject: input.subject,
                description: input.description || `${input.subject} for ${candidateName} (${app.job.title || 'Job'})`,
                tags: [...baseTags, ...(input.tags || [])],
                attachments: input.metadata || undefined,
            },
        });
    }
    static async logSafe(input) {
        try {
            await this.log(input);
        }
        catch (error) {
            console.error('[ApplicationActivityService] Failed to log activity', {
                error,
                applicationId: input.applicationId,
                action: input.action,
            });
        }
    }
    static async logGeneric(input) {
        const knownAction = this.normalizeKnownAction(input.eventName);
        if (knownAction) {
            return this.logSafe({
                applicationId: input.applicationId,
                actorId: input.actorId,
                actorType: input.actorType,
                action: knownAction,
                subject: input.eventName,
                description: `Event captured: ${input.eventName}`,
                metadata: input.payload,
                tags: ['source:generic', 'classification:deterministic'],
            });
        }
        const ai = await this.classifyUnknownEventWithAI(input.eventName, input.payload);
        return this.logSafe({
            applicationId: input.applicationId,
            actorId: input.actorId,
            actorType: input.actorType,
            action: ai.action,
            subject: ai.subject,
            description: ai.description,
            metadata: {
                eventName: input.eventName,
                payload: input.payload || {},
            },
            tags: ['source:generic', 'classification:ai', ...ai.tags],
        });
    }
    static async list(applicationId, limit = 200) {
        const app = await this.getAppContext(applicationId);
        if (!app?.job?.company_id)
            return [];
        const appTag = `application:${applicationId}`;
        const logs = await prisma_1.prisma.activity.findMany({
            where: {
                company_id: app.job.company_id,
                tags: { has: appTag },
            },
            orderBy: { created_at: 'desc' },
            take: limit,
        });
        const actorIds = Array.from(new Set(logs
            .map((log) => log.created_by)
            .filter((id) => !!id && id !== 'system')));
        const users = actorIds.length > 0
            ? await prisma_1.prisma.user.findMany({
                where: { id: { in: actorIds } },
                select: { id: true, name: true, email: true },
            })
            : [];
        const userNameById = new Map(users.map((user) => [user.id, user.name || user.email || 'Unknown user']));
        const unresolvedActorIds = actorIds.filter((id) => !userNameById.has(id));
        const consultants = unresolvedActorIds.length > 0
            ? await prisma_1.prisma.consultant.findMany({
                where: { id: { in: unresolvedActorIds } },
                select: { id: true, first_name: true, last_name: true, email: true },
            })
            : [];
        const consultantNameById = new Map(consultants.map((consultant) => {
            const name = `${consultant.first_name || ''} ${consultant.last_name || ''}`.trim()
                || consultant.email
                || 'Unknown consultant';
            return [consultant.id, name];
        }));
        return logs.map((log) => {
            const eventTag = log.tags.find((t) => t.startsWith('event:')) || 'event:other';
            const action = eventTag.replace('event:', '');
            const createdByName = log.created_by === 'system'
                ? 'System'
                : userNameById.get(log.created_by) || consultantNameById.get(log.created_by) || undefined;
            return {
                id: log.id,
                action,
                type: log.type,
                subject: log.subject,
                description: log.description,
                createdAt: log.created_at,
                createdBy: log.created_by,
                createdByName,
                actorType: log.actor_type,
                tags: log.tags,
                metadata: log.attachments,
            };
        });
    }
}
exports.ApplicationActivityService = ApplicationActivityService;
