"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateJobService = exports.CandidateJobService = void 0;
const service_1 = require("../../core/service");
class CandidateJobService extends service_1.BaseService {
    async processJobAlerts(job) {
        // Stub
    }
}
exports.CandidateJobService = CandidateJobService;
exports.candidateJobService = new CandidateJobService();
