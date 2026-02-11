import { createOpenAI } from '@ai-sdk/openai';
import { generateText, tool, CoreMessage } from 'ai';
import { z } from 'zod';
import { Logger } from '../../utils/logger';
import {
  AssistantActor,
  AssistantChatRequest,
  AssistantChatResponse,
  ToolExecutionRecord,
} from './assistant.types';
import { TOOL_REGISTRY } from './assistant.tool-registry';

const chatRequestSchema = z.object({
  message: z.string().trim().min(2).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(4000),
      })
    )
    .max(20)
    .optional(),
});

const MAX_STEPS = 5;

export class AssistantService {
  private readonly logger = Logger.create('assistant');

  async chat(actor: AssistantActor, rawInput: AssistantChatRequest): Promise<AssistantChatResponse> {
    const request = chatRequestSchema.parse(rawInput);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Assistant is not configured. Missing OPENAI_API_KEY.');
    }

    const modelId = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Prepare history
    const history: CoreMessage[] = (request.history || []).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add current message
    history.push({ role: 'user', content: request.message });

    const toolsUsed: ToolExecutionRecord[] = [];
    const tools: Record<string, any> = {};

    // Map registry to ai sdk tools, wrapping execute to capture usage
    for (const def of TOOL_REGISTRY) {
      const name = def.name;
      tools[name] = tool({
        description: def.description,
        parameters: def.parameters,
        execute: async (args) => {
          const startedAt = Date.now();
          try {
            // Check restrictions if needed, but AccessControl is inside tool logic mostly
            // However, tool.run usually calls access control or we do it here?
            // AssistantStreamService relies on tool.run or explicit checks. 
            // Most tools check access start of run().

            const result = await def.run(args, actor);
            toolsUsed.push({
              name,
              args: args as Record<string, unknown>,
              success: true,
              durationMs: Date.now() - startedAt,
            });

            this.logger.info('assistant.tool.success', {
              actorType: actor.actorType,
              actorId: actor.userId,
              tool: name,
              durationMs: Date.now() - startedAt,
            });

            return result;
          } catch (err: any) {
            const duration = Date.now() - startedAt;
            const errorMessage = err instanceof Error ? err.message : String(err);

            toolsUsed.push({
              name,
              args: args as Record<string, unknown>,
              success: false,
              durationMs: duration,
            });

            this.logger.warn('assistant.tool.failure', {
              actorType: actor.actorType,
              actorId: actor.userId,
              tool: name,
              durationMs: duration,
              error: errorMessage,
            });

            return { error: errorMessage };
          }
        },
      });
    }

    const { text } = await generateText({
      model: openai(modelId),
      system: this.buildSystemPrompt(actor),
      messages: history,
      tools,
      maxSteps: MAX_STEPS,
    });

    return {
      answer: text,
      toolsUsed,
      model: modelId,
    };
  }

  private buildSystemPrompt(actor: AssistantActor): string {
    let scope: string;

    if (actor.actorType === 'COMPANY_USER') {
      scope = `Company-scoped user. companyId=${actor.companyId}, role=${actor.role}.`;
    } else if (actor.actorType === 'HRM8_USER') {
      scope = `HRM8 user. role=${actor.role}, licenseeId=${actor.licenseeId || 'N/A'}, assignedRegionIds=${actor.assignedRegionIds?.join(',') || '[]'
        }.`;
    } else if (actor.actorType === 'CONSULTANT') {
      scope = `Consultant. consultantId=${actor.consultantId}, regionId=${actor.regionId}.`;
    } else {
      scope = 'Unknown user type.';
    }

    return [
      'You are HRM8 Assistant, a high-precision operational copilot for hiring workflows.',
      'Always use tools for factual status/data questions. Never invent IDs, numbers, or statuses.',
      'If multiple records could match, ask a short clarification question.',
      'When data is missing, say so explicitly and propose the exact follow-up query needed.',
      'Keep answers concise, structured, and business-readable.',
      'Treat tool output as source of truth. Do not expose internal implementation details.',
      `Access scope: ${scope}`,
    ].join(' ');
  }
}
