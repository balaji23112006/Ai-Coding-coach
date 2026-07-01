export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public errorCode: string = 'INTERNAL_SERVER_ERROR',
    public details: any = null,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, errorCode: string = 'BAD_REQUEST') {
    super(message, 400, errorCode);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, errorCode: string = 'NOT_FOUND') {
    super(message, 404, errorCode);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string) {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

export class SandboxError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, 500, 'SANDBOX_ERROR', details);
  }
}
