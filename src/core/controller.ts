import { Request, Response } from 'express';
import { ApiResponse } from './api-response';
import { Logger } from '../utils/logger';
import { HttpException } from './http-exception';

export abstract class BaseController {
  protected logger: Logger;

  constructor(namespace: string = 'controller') {
    this.logger = Logger.create(namespace);
  }

  public sendSuccess<T>(res: Response, data: T, statusCodeOrMessage?: number | string, message?: string) {
    let statusCode = 200;
    let msg: string | undefined = undefined;

    if (typeof statusCodeOrMessage === 'number') {
      statusCode = statusCodeOrMessage;
      msg = message;
    } else {
      msg = statusCodeOrMessage;
    }

    return res.status(statusCode).json(ApiResponse.success(data, msg));
  }

  public sendError(res: Response, error: unknown, statusCode: number = 400) {
    // Log error with context
    const req = res.req as Request;
    let finalStatusCode = statusCode;
    let message = error instanceof Error ? error.message : String(error);

    if (error instanceof HttpException) {
      finalStatusCode = error.status;
    }

    this.logger.error(`${req.method} ${req.path} failed`, {
      statusCode: finalStatusCode,
      error: message,
    });

    return res.status(finalStatusCode).json({
      success: false,
      error: message
    });
  }
}
