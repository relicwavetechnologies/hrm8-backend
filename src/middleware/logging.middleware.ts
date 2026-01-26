/**
 * HTTP Logging Middleware
 * Automatically logs all HTTP requests with timing and status codes
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

const logger = Logger.create('http');

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log request
  logger.debug(`→ ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture response using event listener
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.http(req.method, req.path, res.statusCode, duration);
  });

  next();
}
