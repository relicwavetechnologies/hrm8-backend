"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const service_1 = require("../../core/service");
class EmailService extends service_1.BaseService {
    async sendPasswordResetEmail(data) {
        throw new Error('Method not implemented.');
    }
    async sendPasswordChangeConfirmation(data) {
        throw new Error('Method not implemented.');
    }
    async sendCandidateVerificationEmail(data) {
        console.log(`[EmailService] Sending verification email to ${data.to}: ${data.verificationUrl}`);
        return true;
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
