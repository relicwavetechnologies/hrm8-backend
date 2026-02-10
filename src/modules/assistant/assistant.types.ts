import { UserRole } from '@prisma/client';

export type AssistantActorType = 'COMPANY_USER' | 'HRM8_USER';

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

export type AssistantActor = AssistantCompanyActor | AssistantHrm8Actor;

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
