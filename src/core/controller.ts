import { Response } from 'express';
import { ApiResponse } from './api-response';

export abstract class BaseController {
  public sendSuccess<T>(res: Response, data: T, message?: string) {
    return res.json(ApiResponse.success(data, message));
  }

  public sendError(res: Response, error: unknown) {
    if (error instanceof Error) {
        return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
