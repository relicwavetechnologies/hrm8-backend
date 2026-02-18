"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantService = void 0;
const openai_1 = require("@ai-sdk/openai");
const ai_1 = require("ai");
const zod_1 = require("zod");
const logger_1 = require("../../utils/logger");
const assistant_tool_registry_1 = require("./assistant.tool-registry");
const chatRequestSchema = zod_1.z.object({
    message: zod_1.z.string().trim().min(2).max(4000),
    history: zod_1.z
        .array(zod_1.z.object({
        role: zod_1.z.enum(['user', 'assistant']),
        content: zod_1.z.string().trim().min(1).max(4000),
    }))
        .max(20)
        .optional(),
});
const MAX_STEPS = 5;
class AssistantService {
    constructor() {
        this.logger = logger_1.Logger.create('assistant');
    }
    async chat(actor, rawInput) {
        const request = chatRequestSchema.parse(rawInput);
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('Assistant is not configured. Missing OPENAI_API_KEY.');
        }
        const modelId = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const openai = (0, openai_1.createOpenAI)({ apiKey: process.env.OPENAI_API_KEY });
        // Prepare history
        const history = (request.history || []).map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
        // Add current message
        history.push({ role: 'user', content: request.message });
        const toolsUsed = [];
        const tools = {};
        // Map registry to ai sdk tools, wrapping execute to capture usage
        for (const def of assistant_tool_registry_1.TOOL_REGISTRY) {
            const name = def.name;
            tools[name] = (0, ai_1.tool)({
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
                            args: args,
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
                    }
                    catch (err) {
                        const duration = Date.now() - startedAt;
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        toolsUsed.push({
                            name,
                            args: args,
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
        const { text } = await (0, ai_1.generateText)({
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
    buildSystemPrompt(actor) {
        let scope;
        if (actor.actorType === 'COMPANY_USER') {
            scope = `Company-scoped user. companyId=${actor.companyId}, role=${actor.role}.`;
        }
        else if (actor.actorType === 'HRM8_USER') {
            scope = `HRM8 user. role=${actor.role}, licenseeId=${actor.licenseeId || 'N/A'}, assignedRegionIds=${actor.assignedRegionIds?.join(',') || '[]'}.`;
        }
        else if (actor.actorType === 'CONSULTANT') {
            scope = `Consultant. consultantId=${actor.consultantId}, regionId=${actor.regionId}.`;
        }
        else {
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
exports.AssistantService = AssistantService;
