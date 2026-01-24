"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hiringTeamInvitationService = exports.HiringTeamInvitationService = void 0;
const service_1 = require("../../core/service");
class HiringTeamInvitationService extends service_1.BaseService {
    async inviteToHiringTeam(companyId, jobId, jobTitle, inviterId, data) {
        // Stub
    }
}
exports.HiringTeamInvitationService = HiringTeamInvitationService;
exports.hiringTeamInvitationService = new HiringTeamInvitationService();
