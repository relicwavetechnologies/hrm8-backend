"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const http_exception_1 = require("../core/http-exception");
const logger_1 = require("../utils/logger");
const errorMiddleware = (err, _req, res, _next) => {
    if (err instanceof http_exception_1.HttpException) {
        logger_1.logger.warn('Handled HttpException', { status: err.status, message: err.message });
        return res.status(err.status).json({ success: false, message: err.message });
    }
    logger_1.logger.error('Unhandled error', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
};
exports.errorMiddleware = errorMiddleware;
