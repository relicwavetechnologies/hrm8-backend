"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configService = exports.ConfigService = void 0;
const prisma_1 = require("../../utils/prisma");
class ConfigService {
    /**
     * Get a configuration value by key
     * Order of precedence:
     * 1. Database (SystemSetting table)
     * 2. Environment Variable
     * 3. Default value
     */
    static async get(key, defaultValue) {
        try {
            // Check database first
            const setting = await prisma_1.prisma.systemSettings.findUnique({
                where: { key }
            });
            if (setting && setting.value) {
                return String(setting.value);
            }
        }
        catch (error) {
            console.warn(`Failed to fetch setting ${key} from database, falling back to ENV:`, error);
        }
        // Fallback to Env
        return process.env[key] || defaultValue;
    }
    /**
     * Get OpenAI API Key
     */
    static async getOpenAIApiKey() {
        return this.get('OPENAI_API_KEY');
    }
    /**
     * Get OpenAI Model
     */
    static async getOpenAIModel() {
        return (await this.get('OPENAI_MODEL')) || 'gpt-4o-mini';
    }
}
exports.ConfigService = ConfigService;
exports.configService = new ConfigService();
