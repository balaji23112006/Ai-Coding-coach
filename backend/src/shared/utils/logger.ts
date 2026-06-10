/* eslint-disable no-console */
import { AsyncLocalStorage } from 'async_hooks';

export const loggerStorage = new AsyncLocalStorage<{ requestId: string }>();

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatLog(level: LogLevel, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const context = loggerStorage.getStore();
  const reqIdStr = context?.requestId ? `requestId=${context.requestId} ` : '';
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `[${level}] ${timestamp} ${reqIdStr}${message}${metaStr}`;
}

export const logger = {
  info(message: string, meta?: any) {
    console.log(formatLog('INFO', message, meta));
  },
  warn(message: string, meta?: any) {
    console.warn(formatLog('WARN', message, meta));
  },
  error(message: string, error?: any) {
    let errorDetails = error;
    if (error instanceof Error) {
      errorDetails = {
        ...error,
        message: error.message,
        stack: error.stack,
      };
    }
    console.error(formatLog('ERROR', message, errorDetails));
  },
  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatLog('DEBUG', message, meta));
    }
  },
};
