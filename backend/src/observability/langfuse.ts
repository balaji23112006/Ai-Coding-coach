import dotenv from 'dotenv';
import { Langfuse } from 'langfuse';
import { logger } from '../utils/logger.js';

dotenv.config();

const publicKey = process.env.LANGFUSE_PUBLIC_KEY || '';
const secretKey = process.env.LANGFUSE_SECRET_KEY || '';
const baseUrl =
  process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com';

const enabled = Boolean(publicKey && secretKey);

export const langfuse = enabled
  ? new Langfuse({
      publicKey,
      secretKey,
      baseUrl,
    })
  : null;

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /sk-lf-[A-Za-z0-9-]{12,}/g,
  /pk-lf-[A-Za-z0-9-]{12,}/g,
  /gsk_[A-Za-z0-9_-]{12,}/g,
  /AIza[A-Za-z0-9_-]{12,}/g,
  /hf_[A-Za-z0-9_-]{12,}/g,
];

function truncate(value: string, max = 4000): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}... [truncated ${value.length - max} chars]`;
}

export function sanitizeForTrace<T>(value: T): T {
  if (typeof value === 'string') {
    return SECRET_PATTERNS.reduce(
      (text, pattern) => text.replace(pattern, '[REDACTED]'),
      truncate(value),
    ) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForTrace(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (/api[_-]?key|secret|token|authorization|password/i.test(key)) {
          return [key, '[REDACTED]'];
        }
        return [key, sanitizeForTrace(item)];
      }),
    ) as T;
  }

  return value;
}

export async function flushLangfuse() {
  if (!langfuse) return;
  try {
    await langfuse.flushAsync();
  } catch (error) {
    logger.warn(
      `[Langfuse] flush failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function traceLLMCall<T>(params: {
  traceName: string;
  generationName: string;
  provider: string;
  model: string;
  input: unknown;
  modelParameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  call: () => Promise<{
    output: T;
    raw?: unknown;
    usage?: {
      input?: number;
      output?: number;
      total?: number;
    };
  }>;
}): Promise<T> {
  if (!langfuse) {
    return (await params.call()).output;
  }

  const startTime = new Date();
  const trace = langfuse.trace({
    id: params.traceId,
    name: params.traceName,
    input: sanitizeForTrace(params.input),
    userId: params.userId,
    sessionId: params.sessionId,
    tags: ['ai-coding-coach', params.provider],
    metadata: sanitizeForTrace({
      provider: params.provider,
      ...params.metadata,
    }),
  });

  try {
    const result = await params.call();
    trace.generation({
      name: params.generationName,
      model: params.model,
      input: sanitizeForTrace(params.input),
      output: sanitizeForTrace(result.output),
      startTime,
      endTime: new Date(),
      modelParameters: sanitizeForTrace(params.modelParameters || {}),
      usage: result.usage,
      metadata: sanitizeForTrace({
        provider: params.provider,
        rawResponse: result.raw,
      }),
    } as any);
    trace.update({
      output: sanitizeForTrace(result.output),
    });
    return result.output;
  } catch (error) {
    trace.generation({
      name: params.generationName,
      model: params.model,
      input: sanitizeForTrace(params.input),
      startTime,
      endTime: new Date(),
      modelParameters: sanitizeForTrace(params.modelParameters || {}),
      level: 'ERROR',
      statusMessage: error instanceof Error ? error.message : String(error),
      metadata: sanitizeForTrace({
        provider: params.provider,
      }),
    } as any);
    trace.update({
      output: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

export async function traceApiResponse(params: {
  name: string;
  input?: unknown;
  output?: unknown;
  statusCode: number;
  durationMs: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!langfuse) return;

  try {
    langfuse.trace({
      name: params.name,
      input: sanitizeForTrace(params.input),
      output: sanitizeForTrace(params.output),
      userId: params.userId,
      tags: ['ai-coding-coach', 'api-response'],
      metadata: sanitizeForTrace({
        statusCode: params.statusCode,
        durationMs: params.durationMs,
        ...params.metadata,
      }),
    });
  } catch (error) {
    logger.warn(
      `[Langfuse] API trace failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
