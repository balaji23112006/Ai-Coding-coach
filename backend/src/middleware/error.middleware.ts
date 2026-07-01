import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors/custom.errors.js';
import { logger } from '../utils/logger.js';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) {
  if (err instanceof AppError) {
    logger.warn(
      `AppError [${err.errorCode}]: ${err.message} (Status: ${err.statusCode})`,
      err.details,
    );
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.errorCode,
        details: err.details,
      },
    });
  }

  // Handle default Express JSON body parser syntax errors
  if ('status' in err && (err as any).status === 400 && 'body' in err) {
    logger.warn(`JSON body parsing syntax error: ${err.message}`);
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid JSON payload format',
        code: 'BAD_REQUEST',
      },
    });
  }

  logger.error(`Unhandled exception on ${req.method} ${req.path}`, err);

  return res.status(500).json({
    success: false,
    error: {
      message: 'An unexpected internal server error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
}
