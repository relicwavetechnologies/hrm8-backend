import { ActorType, ActivityType } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import OpenAI from 'openai';

type ApplicationActivityType =
  | 'round_changed'
  | 'stage_changed'
  | 'email_sent'
  | 'email_reply_sent'
  | 'sms_sent'
  | 'slack_message_sent'
  | 'call_logged'
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_assigned'
  | 'note_added'
  | 'notes_updated'
  | 'annotation_highlighted'
  | 'annotation_commented'
  | 'interview_scheduled'
  | 'interview_updated'
  | 'interview_cancelled'
  | 'interview_note_added'
  | 'interview_note_deleted'
  | 'other';

const KNOWN_ACTIONS: ApplicationActivityType[] = [
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
  'interview_scheduled',
  'interview_updated',
  'interview_cancelled',
  'interview_note_added',
  'interview_note_deleted',
  'other',
];

interface LogApplicationActivityInput {
  applicationId: string;
  actorId?: string;
  actorType?: ActorType;
  action: ApplicationActivityType;
  subject: string;
  description?: string;
  activityType?: ActivityType;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

interface GenericEventInput {
  applicationId: string;
  actorId?: string;
  actorType?: ActorType;
  eventName: string;
  payload?: Record<string, unknown>;
}

export class ApplicationActivityService {
  private static async getAppContext(applicationId: string) {
    return prisma.application.findUnique({
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

  private static mapToActivityType(action: ApplicationActivityType): ActivityType {
    if (action.includes('email')) return ActivityType.EMAIL;
    if (action.includes('call')) return ActivityType.CALL;
    if (action.includes('interview')) return ActivityType.MEETING;
    if (action.includes('note') || action.includes('annotation')) return ActivityType.NOTE;
    if (action.includes('task')) return ActivityType.TASK;
    return ActivityType.FOLLOW_UP;
  }

  private static normalizeKnownAction(eventName: string): ApplicationActivityType | null {
    const normalized = eventName.trim().toLowerCase().replace(/\s+/g, '_');
    if ((KNOWN_ACTIONS as string[]).includes(normalized)) {
      return normalized as ApplicationActivityType;
    }
    return null;
  }

  private static async classifyUnknownEventWithAI(
    eventName: string,
    payload?: Record<string, unknown>
  ): Promise<{
    action: ApplicationActivityType;
    subject: string;
    description: string;
    tags: string[];
  }> {
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
      const openai = new OpenAI({ apiKey });
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
      if (!content) throw new Error('Empty AI response');
      const parsed = JSON.parse(content) as {
        action?: string;
        subject?: string;
        description?: string;
        tags?: string[];
      };

      const action = (parsed.action && (KNOWN_ACTIONS as string[]).includes(parsed.action))
        ? (parsed.action as ApplicationActivityType)
        : 'other';
      const subject = (parsed.subject || eventName || 'Event captured').slice(0, 80);
      const description = (parsed.description || `Event captured: ${eventName}`).slice(0, 220);
      const tags = Array.isArray(parsed.tags)
        ? parsed.tags.filter((t) => typeof t === 'string').slice(0, 10)
        : [];

      return { action, subject, description, tags };
    } catch (error) {
      console.error('[ApplicationActivityService] AI classification failed', error);
      return {
        action: 'other',
        subject: eventName,
        description: `Event captured: ${eventName}`,
        tags: [`source:generic`, `raw_event:${eventName.toLowerCase().replace(/\s+/g, '_')}`],
      };
    }
  }

  static async log(input: LogApplicationActivityInput) {
    const app = await this.getAppContext(input.applicationId);
    if (!app?.job?.company_id) return null;

    const candidateName = [app.candidate?.first_name, app.candidate?.last_name].filter(Boolean).join(' ').trim() || 'Candidate';
    const baseTags = [
      'scope:application',
      `application:${input.applicationId}`,
      `job:${app.job_id}`,
      `candidate:${app.candidate_id}`,
      `event:${input.action}`,
    ];

    return prisma.activity.create({
      data: {
        company_id: app.job.company_id,
        created_by: input.actorId || 'system',
        actor_type: input.actorType || ActorType.HRM8_USER,
        type: input.activityType || this.mapToActivityType(input.action),
        subject: input.subject,
        description: input.description || `${input.subject} for ${candidateName} (${app.job.title || 'Job'})`,
        tags: [...baseTags, ...(input.tags || [])],
        attachments: (input.metadata as any) || undefined,
      },
    });
  }

  static async logSafe(input: LogApplicationActivityInput) {
    try {
      await this.log(input);
    } catch (error) {
      console.error('[ApplicationActivityService] Failed to log activity', {
        error,
        applicationId: input.applicationId,
        action: input.action,
      });
    }
  }

  static async logGeneric(input: GenericEventInput) {
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

  static async list(applicationId: string, limit = 200) {
    const app = await this.getAppContext(applicationId);
    if (!app?.job?.company_id) return [];
    const appTag = `application:${applicationId}`;

    const logs = await prisma.activity.findMany({
      where: {
        company_id: app.job.company_id,
        tags: { has: appTag },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return logs.map((log) => {
      const eventTag = log.tags.find((t) => t.startsWith('event:')) || 'event:other';
      const action = eventTag.replace('event:', '');
      return {
        id: log.id,
        action,
        type: log.type,
        subject: log.subject,
        description: log.description,
        createdAt: log.created_at,
        createdBy: log.created_by,
        actorType: log.actor_type,
        tags: log.tags,
        metadata: log.attachments,
      };
    });
  }
}
