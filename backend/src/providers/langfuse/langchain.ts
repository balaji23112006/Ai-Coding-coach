import { CallbackHandler } from '@langfuse/langchain';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';

let tracingSdk: NodeSDK | undefined;

function hasConfiguredLangfuseCredentials() {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  return Boolean(
    publicKey &&
      secretKey &&
      !publicKey.includes('your-public-key') &&
      !secretKey.includes('your-secret-key'),
  );
}

function maskSensitiveData({ data }: { data: unknown }): unknown {
  if (typeof data === 'string') {
    return data
      .replace(/AIza[\w-]{20,}/g, '[REDACTED_GOOGLE_API_KEY]')
      .replace(/\b(?:sk|pk)-[\w-]+\b/gi, '[REDACTED_API_KEY]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
  }

  if (Array.isArray(data)) {
    return data.map((value) => maskSensitiveData({ data: value }));
  }

  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [
        key,
        /password|secret|token|api.?key/i.test(key) ? '[REDACTED]' : maskSensitiveData({ data: value }),
      ]),
    );
  }

  return data;
}

function initializeTracing() {
  if (!hasConfiguredLangfuseCredentials() || tracingSdk) {
    return;
  }

  tracingSdk = new NodeSDK({
    spanProcessors: [
      new LangfuseSpanProcessor({
        baseUrl: process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST,
        environment: process.env.NODE_ENV || 'development',
        mask: maskSensitiveData,
      }),
    ],
  });
  tracingSdk.start();
}

export interface SupervisorTracingContext {
  userId?: string;
  sessionId?: string;
}

export function createSupervisorCallback(context: SupervisorTracingContext) {
  if (!hasConfiguredLangfuseCredentials()) {
    return undefined;
  }

  initializeTracing();

  return new CallbackHandler({
    userId: context.userId,
    sessionId: context.sessionId,
    tags: ['supervisor-agent', 'langgraph', 'gemini'],
    traceMetadata: { feature: 'supervisor-agent' },
  });
}

export function createAgentCallback(context: {
  userId?: string;
  sessionId?: string;
  agentName: string;
  tags?: string[];
}) {
  if (!hasConfiguredLangfuseCredentials()) {
    return undefined;
  }

  initializeTracing();

  return new CallbackHandler({
    userId: context.userId,
    sessionId: context.sessionId,
    tags: [context.agentName, 'langgraph', ...(context.tags || [])],
    traceMetadata: { feature: context.agentName },
  });
}

export async function shutdownSupervisorTracing() {
  if (tracingSdk) {
    try {
      await tracingSdk.shutdown();
    } catch (error) {
      // Do not mask the workflow result if telemetry cannot be delivered.
      console.warn('[Langfuse] Failed to flush supervisor tracing.', error);
    } finally {
      tracingSdk = undefined;
    }
  }
}
