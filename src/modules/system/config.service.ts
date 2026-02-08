import { prisma } from '../../utils/prisma';

export class ConfigService {
    /**
     * Get a configuration value by key
     * Order of precedence:
     * 1. Database (SystemSetting table)
     * 2. Environment Variable
     * 3. Default value
     */
    static async get(key: string, defaultValue?: string): Promise<string | undefined> {
        try {
            // Check database first
            const setting = await prisma.systemSettings.findUnique({
                where: { key }
            });

            if (setting && setting.value) {
                return String(setting.value);
            }
        } catch (error) {
            console.warn(`Failed to fetch setting ${key} from database, falling back to ENV:`, error);
        }

        // Fallback to Env
        return process.env[key] || defaultValue;
    }

    /**
     * Get OpenAI API Key
     */
    static async getOpenAIApiKey(): Promise<string | undefined> {
        return this.get('OPENAI_API_KEY');
    }

    /**
     * Get OpenAI Model
     */
    static async getOpenAIModel(): Promise<string> {
        return (await this.get('OPENAI_MODEL')) || 'gpt-4o-mini';
    }
}

export const configService = new ConfigService();
