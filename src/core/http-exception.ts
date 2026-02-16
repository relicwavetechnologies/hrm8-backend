export class HttpException extends Error {
  public readonly status: number;
  public readonly code?: string | number;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, message: string, code?: string | number, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}


