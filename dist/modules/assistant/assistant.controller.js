"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantController = void 0;
const controller_1 = require("../../core/controller");
const assistant_service_1 = require("./assistant.service");
const assistant_stream_service_1 = require("./assistant.stream.service");
const prisma_1 = require("../../utils/prisma");
class AssistantController extends controller_1.BaseController {
    constructor() {
        super(...arguments);
        this.service = new assistant_service_1.AssistantService();
        this.streamService = new assistant_stream_service_1.AssistantStreamService();
        this.companyChat = async (req, res) => {
            try {
                if (!req.user) {
                    return this.sendError(res, new Error('Not authenticated'), 401);
                }
                const result = await this.service.chat({
                    actorType: 'COMPANY_USER',
                    userId: req.user.id,
                    email: req.user.email,
                    companyId: req.user.companyId,
                    role: req.user.role,
                }, req.body);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error, 400);
            }
        };
        this.companyChatStream = async (req, res) => {
            try {
                if (!req.user) {
                    console.error('[Assistant] Company user not authenticated');
                    return this.sendError(res, new Error('Not authenticated'), 401);
                }
                // console.log('[Assistant] Company user authenticated:', {
                //   id: req.user.id,
                //   email: req.user.email,
                //   role: req.user.role,
                //   companyId: req.user.companyId,
                // });
                // console.log('[Assistant] Starting stream for company user:', {
                //   userId: req.user.id,
                //   companyId: req.user.companyId,
                // });
                await this.streamService.streamHrm8({
                    actorType: 'COMPANY_USER',
                    userId: req.user.id,
                    email: req.user.email,
                    companyId: req.user.companyId,
                    role: req.user.role,
                }, req.body, res);
                return;
            }
            catch (error) {
                console.error('[Assistant] Company stream error:', error);
                return this.sendError(res, error, 400);
            }
        };
        this.hrm8Chat = async (req, res) => {
            try {
                if (!req.hrm8User) {
                    return this.sendError(res, new Error('Not authenticated'), 401);
                }
                const result = await this.service.chat({
                    actorType: 'HRM8_USER',
                    userId: req.hrm8User.id,
                    email: req.hrm8User.email ?? '',
                    role: req.hrm8User.role,
                    licenseeId: req.hrm8User.licenseeId,
                    assignedRegionIds: req.assignedRegionIds,
                }, req.body);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error, 400);
            }
        };
        this.consultantChatStream = async (req, res) => {
            try {
                if (!req.consultant) {
                    console.error('[Assistant] Consultant not authenticated');
                    return this.sendError(res, new Error('Not authenticated'), 401);
                }
                // console.log('[Assistant] Consultant authenticated:', {
                //   id: req.consultant.id,
                //   email: req.consultant.email,
                //   role: req.consultant.role,
                // });
                // Fetch consultant details to get region_id
                const consultant = await prisma_1.prisma.consultant.findUnique({
                    where: { id: req.consultant.id },
                    select: { id: true, email: true, role: true, region_id: true },
                });
                // console.log('[Assistant] Consultant from DB:', consultant);
                if (!consultant) {
                    console.error('[Assistant] Consultant not found in database');
                    return this.sendError(res, new Error('Consultant not found'), 404);
                }
                if (!consultant.region_id) {
                    console.error('[Assistant] Consultant has no region assigned');
                    return this.sendError(res, new Error('No region assigned to consultant'), 400);
                }
                // console.log('[Assistant] Starting stream for consultant:', {
                //   consultantId: req.consultant.id,
                //   regionId: consultant.region_id,
                // });
                await this.streamService.streamHrm8({
                    actorType: 'CONSULTANT',
                    userId: req.consultant.id,
                    email: req.consultant.email ?? '',
                    consultantId: req.consultant.id,
                    regionId: consultant.region_id,
                }, req.body, res);
                return;
            }
            catch (error) {
                console.error('[Assistant] Consultant stream error:', error);
                return this.sendError(res, error, 400);
            }
        };
        this.hrm8ChatStream = async (req, res) => {
            try {
                if (!req.hrm8User) {
                    return this.sendError(res, new Error('Not authenticated'), 401);
                }
                await this.streamService.streamHrm8({
                    actorType: 'HRM8_USER',
                    userId: req.hrm8User.id,
                    email: req.hrm8User.email ?? '',
                    role: req.hrm8User.role,
                    licenseeId: req.hrm8User.licenseeId,
                    assignedRegionIds: req.assignedRegionIds,
                }, req.body, res);
                return;
            }
            catch (error) {
                return this.sendError(res, error, 400);
            }
        };
    }
}
exports.AssistantController = AssistantController;
