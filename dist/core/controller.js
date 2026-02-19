"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseController = void 0;
const api_response_1 = require("./api-response");
const logger_1 = require("../utils/logger");
const http_exception_1 = require("./http-exception");
class BaseController {
    constructor(namespace = 'controller') {
        this.logger = logger_1.Logger.create(namespace);
    }
    sendSuccess(res, data, message) {
        return res.json(api_response_1.ApiResponse.success(data, message));
    }
    sendError(res, error, statusCode = 400) {
        // Check if error is an HttpException and use its status code
        if (error instanceof http_exception_1.HttpException) {
            statusCode = error.status;
        }
        // Log error with context
        const req = res.req;
        this.logger.error(`${req.method} ${req.path} failed`, {
            statusCode,
            error: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof Error) {
            return res.status(statusCode).json({ success: false, error: error.message });
        }
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}
exports.BaseController = BaseController;
