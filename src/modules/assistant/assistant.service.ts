import OpenAI from 'openai';
import { z } from 'zod';
import { Logger } from '../../utils/logger';
import {
  AssistantActor,
  AssistantChatRequest,
  AssistantChatResponse,
  ToolExecutionRecord,
} from './assistant.types';
import { assistantTools, getToolByName } from './assistant.tools';

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

const MAX_TOOL_CALLS = 8;

export class AssistantService {
  private readonly logger = Logger.create('assistant');

  async chat(actor: AssistantActor, rawInput: AssistantChatRequest): Promise<AssistantChatResponse> {
    const request = chatRequestSchema.parse(rawInput);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Assistant is not configured. Missing OPENAI_API_KEY.');
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.buildSystemPrompt(actor) },
      ...(request.history || []).map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: request.message },
    ];

    const toolsUsed: ToolExecutionRecord[] = [];

    for (let i = 0; i < MAX_TOOL_CALLS; i += 1) {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.2,
        tools: assistantTools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
      });

      const assistantMessage = completion.choices[0]?.message;
      if (!assistantMessage) {
        throw new Error('Assistant response was empty.');
      }

      messages.push(assistantMessage);

      const toolCalls = assistantMessage.tool_calls ?? [];
      if (!toolCalls.length) {
        const answer = assistantMessage.content?.trim();
        if (!answer) {
          throw new Error('Assistant generated an empty answer.');
        }

        return {
          answer,
          toolsUsed,
          model,
        };
      }

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') continue;

        const toolName = toolCall.function.name;
        const tool = getToolByName(toolName);

        if (!tool) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
          });
          continue;
        }

        const args = this.safeParseArgs(toolCall.function.arguments);
        const startedAt = Date.now();

        try {
          const result = await tool.run(args, actor);
          const durationMs = Date.now() - startedAt;
          toolsUsed.push({ name: toolName, args, success: true, durationMs });

          this.logger.info('assistant.tool.success', {
            actorType: actor.actorType,
            actorId: actor.userId,
            tool: toolName,
            durationMs,
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          const durationMs = Date.now() - startedAt;
          const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';

          toolsUsed.push({ name: toolName, args, success: false, durationMs });

          this.logger.warn('assistant.tool.failure', {
            actorType: actor.actorType,
            actorId: actor.userId,
            tool: toolName,
            durationMs,
            error: errorMessage,
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: errorMessage }),
          });
        }
      }
    }

    throw new Error('Assistant reached tool-call safety limit. Please refine the query and try again.');
  }

  private safeParseArgs(input: string): Record<string, unknown> {
    if (!input || !input.trim()) return {};
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private buildSystemPrompt(actor: AssistantActor): string {
    const scope =
      actor.actorType === 'COMPANY_USER'
        ? `Company-scoped user. companyId=${actor.companyId}, role=${actor.role}.`
        : `HRM8 user. role=${actor.role}, licenseeId=${actor.licenseeId || 'N/A'}, assignedRegionIds=${
            actor.assignedRegionIds?.join(',') || '[]'
          }.`;

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
