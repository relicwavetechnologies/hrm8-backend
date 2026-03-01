import { UserRole } from '@prisma/client';
import { z } from 'zod';

// ─── AI Reference Context Framework ──────────────────────────────────────────

/**
 * Zod schema for a single entity reference token sent from the frontend.
 * Frontend sends IDs/hints only — backend resolves authoritative data.
 */
export const entityReferenceSchema = z.object({
  entityType: z.enum(['job', 'candidate', 'company', 'application', 'consultant', 'custom']),
  entityId: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(200),
  source: z.string().trim().min(1).max(100),
  meta: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export type EntityReference = z.infer<typeof entityReferenceSchema>;

/**
 * Zod schema for the context payload in assistant request body.
 * Validation is intentionally lenient: missing/extra fields are stripped.
 */
export const assistantContextSchema = z.object({
  references: z.array(entityReferenceSchema).max(20).optional(),
  // Existing candidate assessment fields — kept for backward compatibility
  mode: z.string().optional(),
  applicationId: z.string().optional(),
  candidateId: z.string().optional(),
  candidateName: z.string().optional(),
  candidateEmail: z.string().optional(),
  jobId: z.string().optional(),
  jobTitle: z.string().optional(),
  currentStage: z.string().optional(),
  currentStatus: z.string().optional(),
}).passthrough();

/**
 * Backend-resolved shape for a single entity reference.
 * Frontend token is resolved to this authoritative snapshot after ACL checks.
 */
export interface ResolvedReference {
  entityType: EntityReference['entityType'];
  entityId: string;
  label: string;
  /** true = resolved successfully and actor has permission */
  resolved: boolean;
  /** Human-readable context summary injected into the system prompt */
  contextSummary?: string;
  /** Set when the reference could not be resolved or permission was denied */
  error?: string;
}


export type AssistantActorType = 'COMPANY_USER' | 'HRM8_USER' | 'CONSULTANT';

export enum ToolAccessLevel {
  GLOBAL_ADMIN = 'GLOBAL_ADMIN',
  REGIONAL_ADMIN = 'REGIONAL_ADMIN',
  CONSULTANT = 'CONSULTANT',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  COMPANY_USER = 'COMPANY_USER',
}

export type DataSensitivity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AssistantCompanyActor {
  actorType: 'COMPANY_USER';
  userId: string;
  email: string;
  companyId: string;
  role: UserRole;
}

export interface AssistantHrm8Actor {
  actorType: 'HRM8_USER';
  userId: string;
  email: string;
  role: string;
  licenseeId?: string;
  assignedRegionIds?: string[];
}

export interface AssistantConsultantActor {
  actorType: 'CONSULTANT';
  userId: string;
  email: string;
  consultantId: string;
  regionId: string;
}

export type AssistantActor = AssistantCompanyActor | AssistantHrm8Actor | AssistantConsultantActor;

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  allowedRoles: ToolAccessLevel[];
  requiresRegionScope?: boolean;
  requiresCompanyScope?: boolean;
  dataSensitivity: DataSensitivity;
  run: (args: Record<string, unknown>, actor: AssistantActor) => Promise<unknown>;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatRequest {
  message: string;
  history?: AssistantMessage[];
}

export interface ToolExecutionRecord {
  name: string;
  args: Record<string, unknown>;
  success: boolean;
  durationMs: number;
}

export interface AssistantChatResponse {
  answer: string;
  toolsUsed: ToolExecutionRecord[];
  model: string;
}
