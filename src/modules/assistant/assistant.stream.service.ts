import { Readable } from 'stream';
import { createOpenAI } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText, tool, UIMessage } from 'ai';
import { z } from 'zod';
import { Response } from 'express';
import { Logger } from '../../utils/logger';
import { AssistantActor, ToolDefinition } from './assistant.types';
import { TOOL_REGISTRY, getAllToolNames } from './assistant.tool-registry';
import { prisma } from '../../utils/prisma';
import { AssistantAccessControl } from './assistant.access-control';

const MAX_BATCH_CALLS = 8;

// Get all available tool names from registry
const INDIVIDUAL_TOOL_NAMES = getAllToolNames();

// Batch execution schema
const executeToolBatchSchema = z.object({
  calls: z
    .array(
      z.object({
        toolName: z.string(),
        args: z.record(z.unknown()).default({}),
      })
    )
    .min(1)
    .max(MAX_BATCH_CALLS),
});


export class AssistantStreamService {
  private readonly logger = Logger.create('assistant-stream');

  async streamHrm8(actor: AssistantActor, rawBody: any, res: Response): Promise<void> {
    // console.log('[StreamService] streamHrm8 called with actor:', {
    //   actorType: actor.actorType,
    //   userId: actor.userId,
    //   email: actor.email,
    //   consultantId: actor.actorType === 'CONSULTANT' ? actor.consultantId : undefined,
    //   regionId: actor.actorType === 'CONSULTANT' ? actor.regionId : undefined,
    // });

    if (!process.env.OPENAI_API_KEY) {
      this.logger.error('[StreamService] Missing OPENAI_API_KEY');
      throw new Error('Assistant is not configured. Missing OPENAI_API_KEY.');
    }

    const modelId = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // console.log('[StreamService] Normalizing messages from rawBody');
    const messages = this.normalizeMessages(rawBody);
    // console.log('[StreamService] Normalized messages count:', messages.length);

    // Get allowed tools for this actor
    // console.log('[StreamService] Getting allowed tools for actor');
    const allowedTools = AssistantAccessControl.getAllowedTools(TOOL_REGISTRY, actor);
    // console.log('[StreamService] Allowed tools:', {
    //   count: allowedTools.length,
    //   toolNames: allowedTools.map(t => t.name),
    // });

    // this.logger.info('assistant.stream.start', {
    //   actorType: actor.actorType,
    //   actorId: actor.userId,
    //   accessLevel: AssistantAccessControl.getAccessLevel(actor),
    //   allowedToolsCount: allowedTools.length,
    // });

    // Build AI SDK tools from allowed tools
    const aiSdkTools = this.buildAiSdkTools(allowedTools, actor);

    // Add batch execution tool
    aiSdkTools['execute_tool_batch'] = tool({
      description:
        'Execute multiple assistant tools in parallel for broader analytical questions. Provide calls as an array of { toolName, args }. Use this for questions that require multiple data sources.',
      parameters: executeToolBatchSchema,
      execute: async (args: Record<string, unknown>) => this.executeToolBatch(args, actor, allowedTools),
    });

    // console.log('[StreamService] About to call streamText with:', {
    //   modelId,
    //   messagesCount: messages.length,
    //   toolsCount: Object.keys(aiSdkTools).length,
    // });

    // console.log('[StreamService] Messages before conversion:', JSON.stringify(messages, null, 2));
    const coreMessages = convertToCoreMessages(messages);
    // console.log('[StreamService] Messages after conversion:', JSON.stringify(coreMessages, null, 2));

    // Build system prompt (async now)
    const systemPrompt = await this.buildSystemPrompt(actor, allowedTools);
    // console.log('[StreamService] System prompt length:', systemPrompt.length);

    try {
      const result = streamText({
        model: openai(modelId),
        system: systemPrompt,
        messages: coreMessages,
        temperature: 0.2,
        maxSteps: 10,
        tools: aiSdkTools,
        onError: (error) => {
          this.logger.error('[StreamService] OpenAI stream error', { error });
          this.logger.error('OpenAI streaming error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            actorId: actor.userId,
          });
        },
      });

      // console.log('[StreamService] streamText created, converting to DataStreamResponse');
      const streamResponse = result.toDataStreamResponse();

      // console.log('[StreamService] DataStreamResponse created with status:', streamResponse.status);
      res.status(streamResponse.status);

      streamResponse.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });

      if (!streamResponse.body) {
        // console.warn('[StreamService] No response body, ending response');
        res.end();
        return;
      }

      // console.log('[StreamService] Starting stream pipe to response');
      const readable = Readable.fromWeb(streamResponse.body as any);

      readable.on('error', (error) => {
        this.logger.error('[StreamService] Stream error', { error });
        this.logger.error('Stream pipe error', { error, actorId: actor.userId });
      });

      readable.on('end', () => {
        // console.log('[StreamService] Stream ended successfully');
      });

      readable.pipe(res);
    } catch (error) {
      this.logger.error('[StreamService] Error in streamText execution', { error });
      this.logger.error('StreamText error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        actorId: actor.userId,
      });

      // Send error response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to initialize AI stream',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private normalizeMessages(rawBody: any): UIMessage[] {
    // console.log('[StreamService] normalizeMessages - rawBody type:', typeof rawBody);
    // console.log('[StreamService] normalizeMessages - has messages:', Array.isArray(rawBody?.messages));
    // console.log('[StreamService] normalizeMessages - has message:', typeof rawBody?.message);

    const incoming = Array.isArray(rawBody?.messages) ? rawBody.messages : [];

    if (incoming.length > 0) {
      // console.log('[StreamService] normalizeMessages - using incoming messages, count:', incoming.length);
      const filtered = incoming.filter((item: unknown) => item && typeof item === 'object');
      // console.log('[StreamService] normalizeMessages - filtered to:', filtered.length);
      return filtered;
    }

    const fallback = typeof rawBody?.message === 'string' ? rawBody.message.trim() : '';

    if (!fallback) {
      // console.log('[StreamService] normalizeMessages - no messages found, returning empty array');
      return [];
    }

    // console.log('[StreamService] normalizeMessages - using fallback message');
    return [
      {
        id: 'fallback-user-message',
        role: 'user',
        parts: [{ type: 'text', text: fallback }],
      },
    ] as UIMessage[];
  }

  /**
   * Build AI SDK tools from allowed tool definitions
   */
  private buildAiSdkTools(allowedTools: ToolDefinition[], actor: AssistantActor): Record<string, any> {
    const tools: Record<string, any> = {};

    for (const toolDef of allowedTools) {
      tools[toolDef.name] = tool({
        description: toolDef.description,
        parameters: toolDef.parameters,
        execute: async (args: Record<string, unknown>) => {
          try {
            // console.log(`[StreamService] Executing tool: ${toolDef.name} `);
            const result = await this.executeTool(toolDef, args, actor);
            // console.log(`[StreamService] Tool ${toolDef.name} completed: `, { success: result.success });
            return result;
          } catch (error) {
            this.logger.error(`[StreamService] Tool ${toolDef.name} threw error`, { error });
            throw error;
          }
        },
      });
    }

    return tools;
  }

  /**
   * Execute a single tool with access control and auditing
   */
  private async executeTool(
    toolDef: ToolDefinition,
    args: Record<string, unknown>,
    actor: AssistantActor
  ): Promise<{ success: boolean; durationMs: number; data?: unknown; error?: string }> {
    const startedAt = Date.now();

    // Access control check
    if (!AssistantAccessControl.canUseTool(actor, toolDef)) {
      this.logger.warn('assistant.stream.tool.access-denied', {
        tool: toolDef.name,
        actorType: actor.actorType,
        actorId: actor.userId,
      });

      return {
        success: false,
        durationMs: Date.now() - startedAt,
        error: `Access denied: You do not have permission to use this tool.`,
      };
    }

    try {
      // Execute tool
      const rawData = await toolDef.run(args, actor);

      // Apply data redaction based on sensitivity
      const safeData = AssistantAccessControl.redactSensitiveData(actor, rawData, toolDef.dataSensitivity);

      const durationMs = Date.now() - startedAt;

      // this.logger.info('assistant.stream.tool.success', {
      //   tool: toolDef.name,
      //   actorType: actor.actorType,
      //   actorId: actor.userId,
      //   sensitivity: toolDef.dataSensitivity,
      //   durationMs,
      // });

      // Create audit log for sensitive tools
      if (toolDef.dataSensitivity === 'HIGH' || toolDef.dataSensitivity === 'CRITICAL') {
        await AssistantAccessControl.createAuditLog(actor, toolDef.name, args, true, toolDef.dataSensitivity);
      }

      return {
        success: true,
        durationMs,
        data: safeData,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';

      this.logger.warn('assistant.stream.tool.failure', {
        tool: toolDef.name,
        actorType: actor.actorType,
        actorId: actor.userId,
        durationMs,
        error: errorMessage,
      });

      // Create audit log for failures
      await AssistantAccessControl.createAuditLog(actor, toolDef.name, args, false, toolDef.dataSensitivity);

      return {
        success: false,
        durationMs,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute multiple tools in parallel (batch execution)
   */
  private async executeToolBatch(
    input: Record<string, unknown>,
    actor: AssistantActor,
    allowedTools: ToolDefinition[]
  ): Promise<{
    success: boolean;
    durationMs: number;
    calls: Array<{
      toolName: string;
      args: Record<string, unknown>;
      result: { success: boolean; durationMs: number; data?: unknown; error?: string };
    }>;
  }> {
    const startedAt = Date.now();
    const { calls } = executeToolBatchSchema.parse(input);

    // Build allowed tool map
    const toolMap = new Map(allowedTools.map((t) => [t.name, t]));

    const results = await Promise.all(
      calls.map(async (call) => {
        const toolDef = toolMap.get(call.toolName);

        if (!toolDef) {
          return {
            toolName: call.toolName,
            args: call.args,
            result: {
              success: false,
              durationMs: 0,
              error: `Tool '${call.toolName}' not found or not allowed for your role.`,
            },
          };
        }

        const result = await this.executeTool(toolDef, call.args, actor);
        return {
          toolName: call.toolName,
          args: call.args,
          result,
        };
      })
    );

    const durationMs = Date.now() - startedAt;

    // this.logger.info('assistant.stream.tool.batch', {
    //   actorType: actor.actorType,
    //   actorId: actor.userId,
    //   durationMs,
    //   totalCalls: calls.length,
    //   succeededCalls: results.filter((item) => item.result.success).length,
    // });

    return {
      success: results.some((item) => item.result.success),
      durationMs,
      calls: results,
    };
  }

  /**
   * Build system prompt with access control context and personalized greeting
   */
  private async buildSystemPrompt(actor: AssistantActor, allowedTools: ToolDefinition[]): Promise<string> {
    const accessLevel = AssistantAccessControl.getAccessLevel(actor);
    const scopeDescription = AssistantAccessControl.buildScopeDescription(actor);

    // Fetch user name for personalization
    let userName = '';
    let personalizedContext = '';

    try {
      if (actor.actorType === 'CONSULTANT') {
        const consultant = await prisma.consultant.findUnique({
          where: { id: actor.userId },
          select: { first_name: true, last_name: true, region: { select: { name: true } } },
        });
        if (consultant) {
          userName = `${consultant.first_name || ''} ${consultant.last_name || ''} `.trim();
          personalizedContext = `You are assisting ${userName}, a consultant in ${consultant.region?.name || 'your region'}. When they ask about "my" data(jobs, candidates, companies), automatically use their consultant ID.`;
        }
      } else if (actor.actorType === 'HRM8_USER') {
        const user = await prisma.user.findUnique({
          where: { id: actor.userId },
          select: { name: true, email: true },
        });
        if (user) {
          userName = user.name || user.email.split('@')[0];
          personalizedContext = `You are assisting ${userName}, an administrator.You have access to search and query data across consultants and regions based on your permissions.`;
        }
      } else if (actor.actorType === 'COMPANY_USER') {
        const user = await prisma.user.findUnique({
          where: { id: actor.userId },
          select: { name: true },
        });
        if (user?.name) {
          userName = user.name;
          personalizedContext = `You are assisting ${userName} from their company.`;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to fetch user name for system prompt', { error });
    }

    const lines = [
      'You are HRM8 Assistant, a high-precision operational copilot for hiring workflows.',
    ];

    if (personalizedContext) {
      lines.push('', personalizedContext);
    }

    lines.push(
      '',
      '## Core Principles',
      '- Always use tools for factual status/data questions. Never invent IDs, numbers, or statuses.',
      '- For comprehensive queries (e.g., "tell me about candidate X"), prefer composite tools like get_candidate_complete_overview or get_job_complete_dashboard over multiple separate calls.',
      '- For broad requests needing multiple datasets, use execute_tool_batch with multiple tool calls in parallel.',
      '- When tools return success=false, explain the failure briefly and suggest a corrected follow-up query.',
      '- If multiple records could match, ask a short clarification question.',
      '- Keep answers concise, structured, and business-readable.',
      '',
      '## Your Access',
      `Access level: ${accessLevel} `,
      `Scope: ${scopeDescription} `,
      `Available tools: ${allowedTools.length} tools based on your permissions.`,
      '',
      '## Data Security',
      '- CRITICAL: You can ONLY access data within your assigned scope. Never attempt to query data outside your permissions.',
      '- If a user asks for data you cannot access, politely explain the scope limitation.',
      '- All tool executions are audited for security and compliance.',
      '',
      '## Tool Usage Guidelines',
      '- Use get_candidate_complete_overview for questions like "show me candidate details" or "what\'s the status of John Doe?"',
      '- Use get_job_complete_dashboard for questions like "show me job details" or "how is this position doing?"',
      '- Use get_my_daily_briefing (consultants only) for "what\'s on my plate today?" or "show my daily tasks"',
      '- Use get_my_companies, get_my_candidates, get_my_quick_stats (consultants only) for personalized pipeline views',
      '- Use search_consultants (admins only) to find consultants by name before querying their data',
      '- Use get_recent_audit_logs (admins only) to view recent system activity and changes',
      '- Use execute_tool_batch when the user asks for multiple metrics or a comprehensive overview across different entities.',
    );

    return lines.join('\n');
  }
}
