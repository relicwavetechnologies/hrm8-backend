import { UserRole } from '@prisma/client';
import { z } from 'zod';

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
