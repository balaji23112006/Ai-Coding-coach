import { spawn } from 'child_process';
import pidusage from 'pidusage';
import { logger } from '../../../../utils/logger.js';
import { SubmissionStatus, CodeExecutionResult } from '../types/execution.types.js';

export interface ExecuteOptions {
  command: string;
  args: string[];
  stdin: string;
  timeoutMs: number;
}
const MAX_OUTPUT_SIZE = 64 * 1024; // 64KB limit
export async function executeProcess(options: ExecuteOptions): Promise<CodeExecutionResult> {
  const { command, args, stdin, timeoutMs } = options;
  const startTime = performance.now();

  logger.debug(`Spawning child process: ${command} ${args.join(' ')}`);
  const child = spawn(command, args);

  let stdout = '';
  let stderr = '';
  let maxMemory = 0;
  let isTimeout = false;
  let isTruncated = false;
  let finished = false;

  // Start memory sampling at 50ms intervals (only for local non-docker runs to avoid performance hit and useless docker CLI metrics)
  let intervalId: NodeJS.Timeout | undefined;
  if (command !== 'docker') {
    intervalId = setInterval(async () => {
      if (finished || !child.pid) {
        if (intervalId) clearInterval(intervalId);
        return;
      }
      try {
        const stats = await pidusage(child.pid);
        if (stats.memory > maxMemory) {
          maxMemory = stats.memory;
        }
      } catch {
        // Process probably finished between checks
      }
    }, 50);
  }

  // Set timeout monitor
  const timeoutId = setTimeout(() => {
    if (!finished) {
      isTimeout = true;
      logger.warn(`Process timeout limit reached (${timeoutMs}ms). Terminating process.`);
      try {
        child.kill('SIGKILL');
      } catch (err) {
        logger.error('Failed to kill timed out process', err);
      }
    }
  }, timeoutMs);

  const checkOutputLimits = () => {
    if (stdout.length > MAX_OUTPUT_SIZE || stderr.length > MAX_OUTPUT_SIZE) {
      isTruncated = true;
      logger.warn('Output buffer threshold exceeded (64KB). Aborting execution.');
      if (!finished) {
        try {
          child.kill('SIGKILL');
        } catch (err) {
          logger.error('Failed to kill process exceeding output threshold', err);
        }
      }
    }
  };

  child.stdout.on('data', (chunk) => {
    if (isTruncated) return;
    stdout += chunk.toString();
    checkOutputLimits();
  });

  child.stderr.on('data', (chunk) => {
    if (isTruncated) return;
    stderr += chunk.toString();
    checkOutputLimits();
  });

  return new Promise<CodeExecutionResult>((resolve) => {
    const cleanUp = () => {
      finished = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      clearTimeout(timeoutId);
      if (child.pid && command !== 'docker') {
        try {
          pidusage.clear();
        } catch {
          // Ignore clear errors
        }
      }
    };

    child.on('close', (code, signal) => {
      cleanUp();
      const executionTime = Math.round(performance.now() - startTime);

      let status: SubmissionStatus = SubmissionStatus.ACCEPTED;
      let success = true;

      if (isTimeout) {
        status = SubmissionStatus.TIMEOUT;
        success = false;
        stderr = stderr + `\nTime Limit Exceeded: Your code took too long to execute (exceeded limit of ${timeoutMs}ms). This is often caused by an infinite loop or a highly inefficient algorithm.`;
      } else if (isTruncated) {
        status = SubmissionStatus.RUNTIME_ERROR;
        success = false;
        stderr = stderr + `\nOutput Limit Exceeded: Your program printed too much data to standard output (exceeded limit of 1MB). This is usually caused by an infinite loop containing print/console.log statements.`;
      } else if (code !== 0 || signal) {
        status = SubmissionStatus.RUNTIME_ERROR;
        success = false;

        // Map exit code / signals to specific error messages
        const isOOM = (signal === 'SIGKILL' || code === 137);
        const isSegfault = (signal === 'SIGSEGV' || code === 139 || code === 3221225477);
        const isDivByZero = (signal === 'SIGFPE' || code === 136 || code === 3221225620);

        if (isOOM) {
          stderr = stderr + `\nOut of Memory: Your program exceeded the maximum memory limit (128 MB). This is usually caused by creating a very large array, an infinite recursion, or storing too many objects in memory.`;
        } else if (isSegfault) {
          stderr = stderr + `\nSegmentation Fault: Your program tried to access a restricted or invalid memory address. In C/C++, this is typically caused by out-of-bounds array access, dereferencing a null/wild pointer, or stack overflow from deep recursion.`;
        } else if (isDivByZero) {
          stderr = stderr + `\nArithmetic Exception: Division by zero or illegal arithmetic operation.`;
        } else if (code === 126 || code === 127) {
          stderr = stderr + `\nPermission Denied / Command Not Found: The executable could not be run or was not found in the sandbox.`;
        }
      }

      if (stdout.length > MAX_OUTPUT_SIZE) {
        stdout = stdout.slice(0, MAX_OUTPUT_SIZE) + '\n[Output truncated: Exceeded 64KB limit]';
        isTruncated = true;
      }
      if (stderr.length > MAX_OUTPUT_SIZE) {
        stderr =
          stderr.slice(0, MAX_OUTPUT_SIZE) + '\n[Error output truncated: Exceeded 64KB limit]';
        isTruncated = true;
      }

      resolve({
        success,
        status,
        stdout,
        stderr,
        executionTime,
        memoryUsed: maxMemory,
        outputTruncated: isTruncated,
      });
    });

    child.on('error', (err) => {
      cleanUp();
      const executionTime = Math.round(performance.now() - startTime);

      resolve({
        success: false,
        status: SubmissionStatus.FAILED,
        stdout,
        stderr: stderr + `\nProcess startup error: ${err.message}`,
        executionTime,
        memoryUsed: maxMemory,
        outputTruncated: isTruncated,
      });
    });

    // Pipe user code to process stdin
    try {
      child.stdin.write(stdin);
      child.stdin.end();
    } catch (err) {
      logger.error('Failed to stream source to child process stdin', err);
    }
  });
}
