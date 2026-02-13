import { Request, Response } from 'express';
import { ApiResponse } from './api-response';
import { Logger } from '../utils/logger';
import { HttpException } from './http-exception';

export abstract class BaseController {
  protected logger: Logger;

  constructor(namespace: string = 'controller') {
    this.logger = Logger.create(namespace);
  }

  public sendSuccess<T>(res: Response, data: T, message?: string) {
    return res.json(ApiResponse.success(data, message));
  }

  public sendError(res: Response, error: unknown, statusCode: number = 400) {
    // Check if error is an HttpException and use its status code
    if (error instanceof HttpException) {
      statusCode = error.status;
    }

    // Log error with context
    const req = res.req as Request;
    this.logger.error(`${req.method} ${req.path} failed`, {
      statusCode,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error) {
      const payload: Record<string, unknown> = { success: false, error: error.message };
      if (error instanceof HttpException && error.details) {
        payload.data = error.details;
      }
      return res.status(statusCode).json(payload);
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
