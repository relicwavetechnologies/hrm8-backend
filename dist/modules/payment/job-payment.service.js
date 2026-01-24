"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobPaymentService = exports.JobPaymentService = void 0;
const service_1 = require("../../core/service");
class JobPaymentService extends service_1.BaseService {
    async requiresPayment(servicePackage) {
        return servicePackage !== 'self-managed';
    }
    async canPublishJob(jobId) {
        // Stub
        return true;
    }
    async processWalletPayment(jobId, companyId) {
        // Stub
        return { success: true };
    }
    async createJobCheckoutSession(data) {
        // Stub
        return { url: 'http://mock-checkout-url' };
    }
}
exports.JobPaymentService = JobPaymentService;
exports.jobPaymentService = new JobPaymentService();
