import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { loggerStorage, logger } from '../shared/utils/logger.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  loggerStorage.run({ requestId }, () => {
    const startTime = performance.now();
    logger.info(`${req.method} ${req.path} - request started`);

    res.on('finish', () => {
      const durationMs = Math.round(performance.now() - startTime);
      logger.info(
        `${req.method} ${req.path} - request completed status=${res.statusCode} executionTime=${durationMs}ms`,
      );
    });

    next();
  });
}
