"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobDescriptionGeneratorService = exports.JobDescriptionGeneratorService = void 0;
const service_1 = require("../../core/service");
class JobDescriptionGeneratorService extends service_1.BaseService {
    async generateWithAI(data) {
        // Stub
        return { description: "AI generated description", requirements: [], responsibilities: [] };
    }
}
exports.JobDescriptionGeneratorService = JobDescriptionGeneratorService;
exports.jobDescriptionGeneratorService = new JobDescriptionGeneratorService();
