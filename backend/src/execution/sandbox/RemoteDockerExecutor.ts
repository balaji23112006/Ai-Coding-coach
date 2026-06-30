import { CodeExecutionResult } from '../types/execution.types.js';
import { logger } from '../../shared/utils/logger.js';
import { executeProcess, ExecuteOptions } from './ProcessExecutor.js';
import { checkDockerAvailability } from './DockerDetector.js';

// Map-based cache for health status by URL
const healthCache = new Map<string, { result: boolean; time: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Checks the health of the remote Docker executor.
 * Cache health status briefly (30 seconds) per URL to avoid overhead.
 */
async function checkRemoteDockerHealth(url: string, timeoutMs: number): Promise<boolean> {
  const normalizedUrl = url.replace(/\/$/, '');
  const now = Date.now();
  const cached = healthCache.get(normalizedUrl);
  if (cached && now - cached.time < CACHE_TTL_MS) {
    return cached.result;
  }

  const controller = new AbortController();
  // Health check should be fast; default to 5000ms max
  const checkTimeout = Math.min(5000, timeoutMs);
  const timer = setTimeout(() => controller.abort(), checkTimeout);

  let result = false;
  try {
    const healthUrl = `${normalizedUrl}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.ok) {
      result = true;
    } else {
      result = false;
    }
  } catch (err) {
    clearTimeout(timer);
    result = false;
  }

  healthCache.set(normalizedUrl, { result, time: Date.now() });
  return result;
}

/**
 * Sends an execution request via HTTP POST.
 */
async function executeRemotely(
  payload: {
    language: string;
    sourceCode: string;
    stdin: string;
    timeoutMs: number;
    memory: string;
    cpu: string;
  },
  url: string,
  timeoutMs: number
): Promise<CodeExecutionResult> {
  const controller = new AbortController();
  // Ensure HTTP request timeout has at least a 5-second safety margin over the code execution timeout
  const httpTimeout = Math.max(timeoutMs, payload.timeoutMs + 5000);
  const timer = setTimeout(() => controller.abort(), httpTimeout);

  try {
    const executeUrl = `${url.replace(/\/$/, '')}/execute`;
    const response = await fetch(executeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        language: payload.language,
        sourceCode: payload.sourceCode,
        stdin: payload.stdin,
        timeout: payload.timeoutMs,
        memory: payload.memory,
        cpu: payload.cpu,
        executionLimits: {
          timeoutMs: payload.timeoutMs,
          memory: payload.memory,
          cpu: payload.cpu,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as any;
    if (!data) {
      throw new Error('Invalid response: empty response body');
    }

    return {
      success: typeof data.success === 'boolean' ? data.success : data.status === 'ACCEPTED',
      status: data.status || (data.success ? 'ACCEPTED' : 'RUNTIME_ERROR'),
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      executionTime: typeof data.executionTime === 'number' ? data.executionTime : 0,
      memoryUsed: typeof data.memoryUsed === 'number' ? data.memoryUsed : 0,
      outputTruncated: typeof data.outputTruncated === 'boolean' ? data.outputTruncated : false,
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Unified execution logic: Local Docker -> Remote Docker Server -> Fallback Runner
 */
export async function runWithDockerOrFallback(
  language: string,
  localDockerOptions: ExecuteOptions,
  fallbackOptions: ExecuteOptions,
  timeoutMs: number
): Promise<CodeExecutionResult> {
  // 1. Check Local Docker
  const localDockerAvailable = checkDockerAvailability();
  if (localDockerAvailable) {
    return executeProcess(localDockerOptions);
  }

  logger.info('[Executor] Local Docker unavailable.');

  // 2. Check Remote Docker Server
  const remoteDockerEnabled = process.env.REMOTE_DOCKER_ENABLED === 'true';
  const remoteDockerUrl = process.env.REMOTE_DOCKER_URL || '';
  const remoteDockerTimeoutMs = parseInt(process.env.REMOTE_DOCKER_TIMEOUT_MS || '10000', 10);

  if (remoteDockerEnabled && remoteDockerUrl) {
    logger.info('[Executor] Attempting remote execution...');

    const isReachable = await checkRemoteDockerHealth(remoteDockerUrl, remoteDockerTimeoutMs);
    if (isReachable) {
      logger.info('[Executor] Remote executor reachable.');

      try {
        const result = await executeRemotely(
          {
            language,
            sourceCode: localDockerOptions.stdin,
            stdin: localDockerOptions.stdin,
            timeoutMs,
            memory: '128m',
            cpu: '0.5',
          },
          remoteDockerUrl,
          remoteDockerTimeoutMs
        );
        logger.info('[Executor] Executed using remote Docker.');
        return result;
      } catch (err) {
        logger.warn(`Remote execution failed: ${(err as Error).message}`);
      }
    } else {
      logger.info('[Executor] Remote executor unavailable.');
    }
  } else {
    logger.info('[Executor] Remote executor unavailable.');
  }

  // 3. Existing Fallback Runner
  logger.info('[Executor] Falling back to local process runner.');
  return executeProcess(fallbackOptions);
}
