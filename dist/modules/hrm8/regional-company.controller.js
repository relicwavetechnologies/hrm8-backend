"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionalCompanyController = void 0;
const regional_company_service_1 = require("./regional-company.service");
class RegionalCompanyController {
    constructor() {
        this.getById = async (req, res, next) => {
            try {
                const id = this.getParam(req.params.id);
                const result = await this.regionalCompanyService.getById(id);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getCompanyJobs = async (req, res, next) => {
            try {
                const id = this.getParam(req.params.id);
                const result = await this.regionalCompanyService.getCompanyJobs(id);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.regionalCompanyService = new regional_company_service_1.RegionalCompanyService();
    }
    getParam(value) {
        if (Array.isArray(value))
            return value[0];
        return value || '';
    }
}
exports.RegionalCompanyController = RegionalCompanyController;
