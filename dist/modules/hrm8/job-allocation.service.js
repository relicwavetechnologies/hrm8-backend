"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobAllocationService = exports.JobAllocationService = void 0;
const service_1 = require("../../core/service");
class JobAllocationService extends service_1.BaseService {
    async autoAssignJob(jobId) {
        // Stub
    }
    async getPipelineForJob(jobId, consultantId) {
        // Stub
        return null;
    }
}
exports.JobAllocationService = JobAllocationService;
exports.jobAllocationService = new JobAllocationService();
