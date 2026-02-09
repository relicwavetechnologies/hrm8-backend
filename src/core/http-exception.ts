export class HttpException extends Error {
  public readonly status: number;
  public readonly code?: string | number;

  constructor(status: number, message: string, code?: string | number) {
    super(message);
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}


