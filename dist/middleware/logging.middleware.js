"use strict";
/**
 * HTTP Logging Middleware
 * Automatically logs all HTTP requests with timing and status codes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingMiddleware = loggingMiddleware;
const logger_1 = require("../utils/logger");
const logger = logger_1.Logger.create('http');
function loggingMiddleware(req, res, next) {
    const startTime = Date.now();
    // Log request
    /*
    logger.debug(`→ ${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    */
    // Capture response using event listener
    res.on('finish', () => {
        // const duration = Date.now() - startTime;
        // logger.http(req.method, req.path, res.statusCode, duration);
    });
    next();
}
