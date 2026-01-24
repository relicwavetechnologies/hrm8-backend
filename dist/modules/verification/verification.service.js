"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationService = exports.VerificationService = void 0;
const service_1 = require("../../core/service");
class VerificationService extends service_1.BaseService {
    async verifyByEmailToken(companyId, token) {
        // Stub
        return true;
    }
    async resendVerificationEmail(email) {
        // Stub
        return {};
    }
    async initiateEmailVerification(company, email) {
        // Stub
    }
    async initiateManualVerification(companyId, data) {
        // Stub
    }
}
exports.VerificationService = VerificationService;
exports.verificationService = new VerificationService();
