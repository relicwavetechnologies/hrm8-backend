"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateController = void 0;
const controller_1 = require("../../core/controller");
const email_template_service_1 = require("./email-template.service");
class EmailTemplateController extends controller_1.BaseController {
    constructor() {
        super();
        this.getAll = async (req, res) => {
            try {
                const templates = await this.service.getAll(req.hrm8User?.licenseeId);
                return this.sendSuccess(res, templates);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.create = async (req, res) => {
            try {
                const template = await this.service.create({
                    ...req.body,
                    createdBy: req.hrm8User?.id,
                    licenseeId: req.hrm8User?.licenseeId // Optional, if regional admin
                });
                return this.sendSuccess(res, template);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.update = async (req, res) => {
            try {
                const id = this.getParam(req.params.id);
                const template = await this.service.update(id, req.body);
                return this.sendSuccess(res, template);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.delete = async (req, res) => {
            try {
                const id = this.getParam(req.params.id);
                await this.service.delete(id);
                return this.sendSuccess(res, { message: 'Template deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getVariables = async (req, res) => {
            try {
                const variables = this.service.getVariables();
                return this.sendSuccess(res, variables);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.preview = async (req, res) => {
            try {
                const id = this.getParam(req.params.id);
                const preview = await this.service.preview(id, req.body);
                return this.sendSuccess(res, preview);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.service = new email_template_service_1.EmailTemplateService();
    }
    getParam(value) {
        if (Array.isArray(value))
            return value[0];
        return value || '';
    }
}
exports.EmailTemplateController = EmailTemplateController;
