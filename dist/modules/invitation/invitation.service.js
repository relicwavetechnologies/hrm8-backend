"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invitationService = exports.InvitationService = void 0;
const service_1 = require("../../core/service");
class InvitationService extends service_1.BaseService {
    async findByToken(token) {
        throw new Error('Method not implemented.');
    }
    isInvitationValid(invitation) {
        throw new Error('Method not implemented.');
    }
    async acceptInvitation(id) {
        throw new Error('Method not implemented.');
    }
}
exports.InvitationService = InvitationService;
exports.invitationService = new InvitationService();
