"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantStreamService = void 0;
const stream_1 = require("stream");
const openai_1 = require("@ai-sdk/openai");
const ai_1 = require("ai");
const zod_1 = require("zod");
const logger_1 = require("../../utils/logger");
const assistant_types_1 = require("./assistant.types");
const assistant_tool_registry_1 = require("./assistant.tool-registry");
const prisma_1 = require("../../utils/prisma");
const assistant_access_control_1 = require("./assistant.access-control");
const MAX_BATCH_CALLS = 8;
// Batch execution schema
const executeToolBatchSchema = zod_1.z.object({
    calls: zod_1.z
        .array(zod_1.z.object({
        toolName: zod_1.z.string(),
        args: zod_1.z.record(zod_1.z.unknown()).default({}),
    }))
        .min(1)
        .max(MAX_BATCH_CALLS),
});
const candidateAssessmentContextSchema = zod_1.z.object({
    mode: zod_1.z.literal('candidate_assessment').optional(),
    applicationId: zod_1.z.string().trim().min(1).max(120).optional(),
    candidateId: zod_1.z.string().trim().min(1).max(120).optional(),
    candidateName: zod_1.z.string().trim().min(1).max(200).optional(),
    candidateEmail: zod_1.z.string().trim().min(3).max(200).optional(),
    jobId: zod_1.z.string().trim().min(1).max(120).optional(),
    jobTitle: zod_1.z.string().trim().min(1).max(200).optional(),
    currentStage: zod_1.z.string().trim().min(1).max(200).optional(),
    currentStatus: zod_1.z.string().trim().min(1).max(200).optional(),
}).partial();
class AssistantStreamService {
    constructor() {
        this.logger = logger_1.Logger.create('assistant-stream');
    }
    async streamHrm8(actor, rawBody, res) {
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
        const openai = (0, openai_1.createOpenAI)({ apiKey: process.env.OPENAI_API_KEY });
        // console.log('[StreamService] Normalizing messages from rawBody');
        const messages = this.normalizeMessages(rawBody);
        // console.log('[StreamService] Normalized messages count:', messages.length);
        // Get allowed tools for this actor
        // console.log('[StreamService] Getting allowed tools for actor');
        const allowedTools = assistant_access_control_1.AssistantAccessControl.getAllowedTools(assistant_tool_registry_1.TOOL_REGISTRY, actor);
        const candidateContext = this.normalizeCandidateContext(rawBody);
        const scopedTools = this.filterToolsForContext(allowedTools, candidateContext);
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
        const aiSdkTools = this.buildAiSdkTools(scopedTools, actor, candidateContext);
        // Add batch execution tool
        aiSdkTools['execute_tool_batch'] = (0, ai_1.tool)({
            description: 'Execute multiple assistant tools in parallel for broader analytical questions. Provide calls as an array of { toolName, args }. Use this for questions that require multiple data sources.',
            parameters: executeToolBatchSchema,
            execute: async (args) => this.executeToolBatch(args, actor, scopedTools, candidateContext),
        });
        // console.log('[StreamService] About to call streamText with:', {
        //   modelId,
        //   messagesCount: messages.length,
        //   toolsCount: Object.keys(aiSdkTools).length,
        // });
        // console.log('[StreamService] Messages before conversion:', JSON.stringify(messages, null, 2));
        const coreMessages = (0, ai_1.convertToCoreMessages)(messages);
        // console.log('[StreamService] Messages after conversion:', JSON.stringify(coreMessages, null, 2));
        // Resolve entity references from context payload (MVP: job type)
        const rawRefs = this.normalizeReferences(rawBody);
        const resolvedRefs = rawRefs.length > 0 ? await this.resolveReferences(rawRefs, actor) : [];
        // Build system prompt (async now)
        const systemPrompt = await this.buildSystemPrompt(actor, scopedTools, candidateContext, resolvedRefs);
        // console.log('[StreamService] System prompt length:', systemPrompt.length);
        try {
            const result = (0, ai_1.streamText)({
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
            streamResponse.headers.forEach((value, key) => {
                res.setHeader(key, value);
            });
            if (!streamResponse.body) {
                // console.warn('[StreamService] No response body, ending response');
                res.end();
                return;
            }
            // console.log('[StreamService] Starting stream pipe to response');
            const readable = stream_1.Readable.fromWeb(streamResponse.body);
            readable.on('error', (error) => {
                this.logger.error('[StreamService] Stream error', { error });
                this.logger.error('Stream pipe error', { error, actorId: actor.userId });
            });
            readable.on('end', () => {
                // console.log('[StreamService] Stream ended successfully');
            });
            readable.pipe(res);
        }
        catch (error) {
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
    /**
     * Parse and validate entity references from the raw request body.
     * Returns an empty array (not an error) if context.references is missing or invalid.
     */
    normalizeReferences(rawBody) {
        const rawRefs = rawBody?.context?.references;
        if (!Array.isArray(rawRefs) || rawRefs.length === 0)
            return [];
        const valid = [];
        for (const item of rawRefs) {
            const parsed = assistant_types_1.entityReferenceSchema.safeParse(item);
            if (parsed.success)
                valid.push(parsed.data);
        }
        return valid.slice(0, 20); // hard cap
    }
    /**
     * Resolve entity references to authoritative data with ACL enforcement.
     * Currently supports: job.
     * Others resolve as label-only so the assistant at least knows what was attached.
     */
    async resolveReferences(refs, actor) {
        const results = await Promise.all(refs.map(async (ref) => {
            try {
                if (ref.entityType === 'job') {
                    return await this.resolveJobReference(ref, actor);
                }
                // Passthrough for unsupported types — assistant knows label/ID but no snapshot
                return {
                    entityType: ref.entityType,
                    entityId: ref.entityId,
                    label: ref.label,
                    resolved: false,
                    contextSummary: `${ref.entityType} referenced: ${ref.label} (id: ${ref.entityId})`,
                };
            }
            catch (err) {
                this.logger.warn('assistant.references.resolve-error', {
                    entityType: ref.entityType,
                    entityId: ref.entityId,
                    error: err instanceof Error ? err.message : String(err),
                });
                return {
                    entityType: ref.entityType,
                    entityId: ref.entityId,
                    label: ref.label,
                    resolved: false,
                    error: 'Resolution failed',
                };
            }
        }));
        return results;
    }
    /**
     * Resolve a single job reference with actor scope enforcement.
     */
    async resolveJobReference(ref, actor) {
        const job = await prisma_1.prisma.job.findUnique({
            where: { id: ref.entityId },
            select: {
                id: true,
                title: true,
                status: true,
                employment_type: true,
                location: true,
                department: true,
                experience_level: true,
                company_id: true,
            },
        });
        if (!job) {
            return {
                entityType: 'job',
                entityId: ref.entityId,
                label: ref.label,
                resolved: false,
                error: 'Job not found or access denied',
            };
        }
        // ACL: COMPANY_USER can only see their own company's jobs
        if (actor.actorType === 'COMPANY_USER' && job.company_id !== actor.companyId) {
            this.logger.warn('assistant.references.acl-denied', {
                entityType: 'job',
                entityId: ref.entityId,
                actorId: actor.userId,
            });
            return {
                entityType: 'job',
                entityId: ref.entityId,
                label: ref.label,
                resolved: false,
                error: 'Access denied',
            };
        }
        const summary = [
            `Job: ${job.title}`,
            `Status: ${job.status}`,
            job.department ? `Department: ${job.department}` : null,
            job.location ? `Location: ${job.location}` : null,
            job.employment_type ? `Employment type: ${job.employment_type}` : null,
            job.experience_level ? `Experience level: ${job.experience_level}` : null,
        ]
            .filter(Boolean)
            .join(' | ');
        return {
            entityType: 'job',
            entityId: job.id,
            label: job.title,
            resolved: true,
            contextSummary: summary,
        };
    }
    /**
     * Build the "Attached Context" section of the system prompt from resolved references.
     */
    buildReferencePromptSection(resolved) {
        if (resolved.length === 0)
            return '';
        const lines = ['', '## Attached Context (user-provided references)', 'The user has attached the following records to this conversation:'];
        for (const ref of resolved) {
            if (ref.resolved && ref.contextSummary) {
                lines.push(`- [${ref.entityType.toUpperCase()}] ${ref.contextSummary}`);
            }
            else if (!ref.error || ref.error !== 'Access denied') {
                // Show label-only refs but not ACL failures (avoid leaking that record exists)
                lines.push(`- [${ref.entityType.toUpperCase()}] ${ref.label} (details unavailable)`);
            }
        }
        lines.push('', 'When the user refers to "this job", "this candidate", etc., use the above records as the primary scope.', 'Do not ask the user to specify which record they mean if a single reference of that type is attached.');
        return lines.join('\n');
    }
    normalizeMessages(rawBody) {
        // console.log('[StreamService] normalizeMessages - rawBody type:', typeof rawBody);
        // console.log('[StreamService] normalizeMessages - has messages:', Array.isArray(rawBody?.messages));
        // console.log('[StreamService] normalizeMessages - has message:', typeof rawBody?.message);
        const incoming = Array.isArray(rawBody?.messages) ? rawBody.messages : [];
        if (incoming.length > 0) {
            // console.log('[StreamService] normalizeMessages - using incoming messages, count:', incoming.length);
            const filtered = incoming.filter((item) => item && typeof item === 'object');
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
        ];
    }
    normalizeCandidateContext(rawBody) {
        const rawContext = rawBody?.context;
        if (!rawContext || typeof rawContext !== 'object') {
            return undefined;
        }
        const parsed = candidateAssessmentContextSchema.safeParse(rawContext);
        if (!parsed.success) {
            return undefined;
        }
        if (!parsed.data.applicationId &&
            !parsed.data.candidateId &&
            !parsed.data.candidateEmail &&
            !parsed.data.candidateName) {
            return undefined;
        }
        return {
            mode: parsed.data.mode || 'candidate_assessment',
            ...parsed.data,
        };
    }
    filterToolsForContext(allowedTools, context) {
        if (!context || context.mode !== 'candidate_assessment') {
            return allowedTools;
        }
        const candidateToolNames = new Set([
            'get_candidate_drawer_overview',
            'get_candidate_drawer_resume',
            'get_candidate_drawer_ai_review',
            'get_candidate_drawer_notes',
            'get_candidate_drawer_questionnaire',
            'get_candidate_drawer_annotations',
            'get_candidate_drawer_meetings',
            'get_candidate_drawer_emails',
            'get_candidate_drawer_tasks',
            'get_candidate_drawer_activity',
            'get_candidate_complete_overview',
            'get_interview_details',
            'get_offer_status',
            'update_candidate_stage',
            'add_candidate_note',
            'schedule_candidate_interview',
            'add_interview_note',
            'send_candidate_email',
            'create_candidate_task',
            'add_task_note',
        ]);
        const filtered = allowedTools.filter((tool) => candidateToolNames.has(tool.name));
        return filtered.length > 0 ? filtered : allowedTools;
    }
    enrichToolArgsFromContext(toolName, args, context) {
        if (!context) {
            return args;
        }
        const enrichedArgs = { ...args };
        const applicationScopedTools = new Set([
            'get_candidate_drawer_overview',
            'get_candidate_drawer_resume',
            'get_candidate_drawer_ai_review',
            'get_candidate_drawer_notes',
            'get_candidate_drawer_questionnaire',
            'get_candidate_drawer_annotations',
            'get_candidate_drawer_meetings',
            'get_candidate_drawer_emails',
            'get_candidate_drawer_tasks',
            'get_candidate_drawer_activity',
            'get_candidate_complete_overview',
            'get_interview_details',
            'get_offer_status',
            'update_candidate_stage',
            'add_candidate_note',
            'schedule_candidate_interview',
            'add_interview_note',
            'send_candidate_email',
            'create_candidate_task',
            'add_task_note',
        ]);
        if (context.applicationId && applicationScopedTools.has(toolName)) {
            enrichedArgs.applicationId = context.applicationId;
        }
        const candidateQuery = context.candidateEmail || context.candidateName || context.candidateId;
        if (toolName === 'get_candidate_complete_overview' && !enrichedArgs.candidateQuery && candidateQuery) {
            enrichedArgs.candidateQuery = candidateQuery;
        }
        if (toolName === 'search_candidates_by_name' && !enrichedArgs.query && candidateQuery) {
            enrichedArgs.query = candidateQuery;
        }
        return enrichedArgs;
    }
    /**
     * Build AI SDK tools from allowed tool definitions
     */
    buildAiSdkTools(allowedTools, actor, context) {
        const tools = {};
        for (const toolDef of allowedTools) {
            tools[toolDef.name] = (0, ai_1.tool)({
                description: toolDef.description,
                parameters: toolDef.parameters,
                execute: async (args) => {
                    try {
                        const enrichedArgs = this.enrichToolArgsFromContext(toolDef.name, args, context);
                        // console.log(`[StreamService] Executing tool: ${toolDef.name} `);
                        const result = await this.executeTool(toolDef, enrichedArgs, actor);
                        // console.log(`[StreamService] Tool ${toolDef.name} completed: `, { success: result.success });
                        return result;
                    }
                    catch (error) {
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
    async executeTool(toolDef, args, actor) {
        const startedAt = Date.now();
        // Access control check
        if (!assistant_access_control_1.AssistantAccessControl.canUseTool(actor, toolDef)) {
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
            const safeData = assistant_access_control_1.AssistantAccessControl.redactSensitiveData(actor, rawData, toolDef.dataSensitivity);
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
                await assistant_access_control_1.AssistantAccessControl.createAuditLog(actor, toolDef.name, args, true, toolDef.dataSensitivity);
            }
            return {
                success: true,
                durationMs,
                data: safeData,
            };
        }
        catch (error) {
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
            await assistant_access_control_1.AssistantAccessControl.createAuditLog(actor, toolDef.name, args, false, toolDef.dataSensitivity);
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
    async executeToolBatch(input, actor, allowedTools, context) {
        const startedAt = Date.now();
        const { calls } = executeToolBatchSchema.parse(input);
        // Build allowed tool map
        const toolMap = new Map(allowedTools.map((t) => [t.name, t]));
        const results = await Promise.all(calls.map(async (call) => {
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
            const enrichedArgs = this.enrichToolArgsFromContext(toolDef.name, call.args, context);
            const result = await this.executeTool(toolDef, enrichedArgs, actor);
            return {
                toolName: call.toolName,
                args: enrichedArgs,
                result,
            };
        }));
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
    async buildSystemPrompt(actor, allowedTools, context, resolvedRefs) {
        const accessLevel = assistant_access_control_1.AssistantAccessControl.getAccessLevel(actor);
        const scopeDescription = assistant_access_control_1.AssistantAccessControl.buildScopeDescription(actor);
        // Fetch user name for personalization
        let userName = '';
        let personalizedContext = '';
        try {
            if (actor.actorType === 'CONSULTANT') {
                const consultant = await prisma_1.prisma.consultant.findUnique({
                    where: { id: actor.userId },
                    select: { first_name: true, last_name: true, region: { select: { name: true } } },
                });
                if (consultant) {
                    userName = `${consultant.first_name || ''} ${consultant.last_name || ''} `.trim();
                    personalizedContext = `You are assisting ${userName}, a consultant in ${consultant.region?.name || 'your region'}. When they ask about "my" data(jobs, candidates, companies), automatically use their consultant ID.`;
                }
            }
            else if (actor.actorType === 'HRM8_USER') {
                const user = await prisma_1.prisma.user.findUnique({
                    where: { id: actor.userId },
                    select: { name: true, email: true },
                });
                if (user) {
                    userName = user.name || user.email.split('@')[0];
                    personalizedContext = `You are assisting ${userName}, an administrator.You have access to search and query data across consultants and regions based on your permissions.`;
                }
            }
            else if (actor.actorType === 'COMPANY_USER') {
                const user = await prisma_1.prisma.user.findUnique({
                    where: { id: actor.userId },
                    select: { name: true },
                });
                if (user?.name) {
                    userName = user.name;
                    personalizedContext = `You are assisting ${userName} from their company.`;
                }
            }
        }
        catch (error) {
            this.logger.warn('Failed to fetch user name for system prompt', { error });
        }
        const lines = [
            'You are HRM8 Assistant, a high-precision operational copilot for hiring workflows.',
        ];
        if (personalizedContext) {
            lines.push('', personalizedContext);
        }
        // Inject resolved reference context
        if (resolvedRefs && resolvedRefs.length > 0) {
            lines.push(this.buildReferencePromptSection(resolvedRefs));
        }
        if (context && context.mode === 'candidate_assessment') {
            lines.push('', '## Candidate Assessment Context', 'You are currently helping inside a candidate assessment drawer.', `Default applicationId: ${context.applicationId || 'unknown'} `, `Candidate: ${context.candidateName || 'unknown'} (${context.candidateEmail || 'email unavailable'})`, `Job: ${context.jobTitle || 'unknown'} `, `Current stage/status: ${context.currentStage || 'unknown'} / ${context.currentStatus || 'unknown'}`, '- You are locked to this candidate+job context. Do not switch scope unless user explicitly leaves this drawer flow.', '- Prefer tools that use applicationId and candidate context from this drawer.', '- If user says "this candidate", DO NOT ask for candidate name/email; resolve via applicationId context.', '- If the user asks for a write action (move stage, add note, schedule interview), execute it with available context.', '- After write actions, summarize exactly what changed and surface any missing/invalid fields.', '- Do not return raw dumps. Always provide interpretation and hiring insight.');
        }
        lines.push('', '## Core Principles', '- Always use tools for factual status/data questions. Never invent IDs, numbers, or statuses.', '- For comprehensive queries (e.g., "tell me about candidate X"), prefer composite tools like get_candidate_complete_overview or get_job_complete_dashboard over multiple separate calls.', '- For broad requests needing multiple datasets, use execute_tool_batch with multiple tool calls in parallel.', '- When tools return success=false, explain the failure briefly and suggest a corrected follow-up query.', '- If multiple records could match, ask a short clarification question.', '- Keep answers concise, structured, business-readable, and insight-heavy.', '', '## Response Quality Bar', '- Never just list raw fields. Translate data into implications for hiring decisions.', '- Quantify where possible (counts, dates, trend direction, risk level).', '- Highlight contradictions or gaps (e.g., strong claims but no evidence, missing interview feedback).', '- Prioritize what matters most for next decision, not everything equally.', '- When confidence is limited by missing data, state it clearly and explain what evidence is missing.', '', '## Default Answer Format (Candidate Drawer)', '1. Snapshot: 2-4 lines on current status and momentum.', '2. What stands out: strengths and risk signals with evidence from tools.', '3. Decision impact: fit level for this role and why.', '4. Recommended next actions: concrete, prioritized actions.', '5. Missing evidence: what to collect next to de-risk the decision.', '', '## Your Access', `Access level: ${accessLevel} `, `Scope: ${scopeDescription} `, `Available tools: ${allowedTools.length} tools based on your permissions.`, '', '## Data Security', '- CRITICAL: You can ONLY access data within your assigned scope. Never attempt to query data outside your permissions.', '- If a user asks for data you cannot access, politely explain the scope limitation.', '- All tool executions are audited for security and compliance.', '', '## Tool Usage Guidelines', '- Use granular drawer tools: get_candidate_drawer_overview, get_candidate_drawer_resume, get_candidate_drawer_ai_review, get_candidate_drawer_notes, get_candidate_drawer_questionnaire, get_candidate_drawer_annotations, get_candidate_drawer_meetings, get_candidate_drawer_emails, get_candidate_drawer_tasks, get_candidate_drawer_activity.', '- For broad prompts like "tell me about this candidate", call execute_tool_batch with relevant drawer tools, then synthesize insights (not raw data).', '- Use get_candidate_complete_overview for candidate profile summary. In candidate drawer context, pass/use applicationId directly.', '- Use get_job_complete_dashboard for questions like "show me job details" or "how is this position doing?"', '- Use update_candidate_stage to move a candidate stage when the user explicitly asks to move/reject/progress.', '- Use add_candidate_note to add notes on the candidate application.', '- Use schedule_candidate_interview to schedule interviews and add_interview_note for interview-specific notes.', '- Use send_candidate_email to send candidate emails and create_candidate_task/add_task_note for task actions.', '- Use get_my_daily_briefing (consultants only) for "what\'s on my plate today?" or "show my daily tasks"', '- Use get_my_companies, get_my_candidates, get_my_quick_stats (consultants only) for personalized pipeline views', '- Use search_consultants (admins only) to find consultants by name before querying their data', '- Use get_recent_audit_logs (admins only) to view recent system activity and changes', '- Use execute_tool_batch when the user asks for multiple metrics or a comprehensive overview across different entities.');
        return lines.join('\n');
    }
}
exports.AssistantStreamService = AssistantStreamService;
