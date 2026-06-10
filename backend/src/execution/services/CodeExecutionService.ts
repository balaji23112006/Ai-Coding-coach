import { SubmissionStatus } from '@prisma/client';
import { JavascriptRunner } from '../runners/javascript/JavascriptRunner.js';
import { PythonRunner } from '../runners/python/PythonRunner.js';
import { CodeExecutionPayload, CodeExecutionResult } from '../types/execution.types.js';
import { BadRequestError } from '../../shared/errors/custom.errors.js';
import { logger } from '../../shared/utils/logger.js';

export class CodeExecutionService {
  private jsRunner = new JavascriptRunner();
  private pyRunner = new PythonRunner();

  async execute(payload: CodeExecutionPayload): Promise<CodeExecutionResult> {
    const { language, sourceCode } = payload;
    const timeoutMs = parseInt(process.env.SANDBOX_TIMEOUT_MS || '5000', 10);

    logger.info(`Initiating code run: language=${language} codeLength=${sourceCode.length} bytes`);

    let runner;
    if (language === 'javascript') {
      runner = this.jsRunner;
    } else if (language === 'python') {
      runner = this.pyRunner;
    } else {
      throw new BadRequestError(`Language runner not supported: ${language}`);
    }

    const result = await runner.run(sourceCode, timeoutMs);

    let finalStatus = result.status;
    let finalSuccess = result.success;

    // Check for compilation errors vs runtime errors in case of failure
    if (finalStatus === SubmissionStatus.TIMEOUT) {
      finalSuccess = false;
    } else if (finalStatus === SubmissionStatus.RUNTIME_ERROR || !result.success) {
      finalSuccess = false;
      const stderr = result.stderr;
      
      if (language === 'javascript') {
        if (
          stderr.includes('SyntaxError:') ||
          stderr.toLowerCase().includes('unexpected token') ||
          stderr.toLowerCase().includes('unexpected identifier')
        ) {
          finalStatus = SubmissionStatus.COMPILATION_ERROR;
        } else {
          finalStatus = SubmissionStatus.RUNTIME_ERROR;
        }
      } else if (language === 'python') {
        if (
          stderr.includes('SyntaxError:') ||
          stderr.includes('IndentationError:') ||
          stderr.includes('TabError:')
        ) {
          finalStatus = SubmissionStatus.COMPILATION_ERROR;
        } else {
          finalStatus = SubmissionStatus.RUNTIME_ERROR;
        }
      }
    } else {
      finalStatus = SubmissionStatus.ACCEPTED;
      finalSuccess = true;
    }

    logger.info(
      `Code run finished: success=${finalSuccess} status=${finalStatus} executionTime=${result.executionTime}ms memoryUsed=${result.memoryUsed} bytes`,
    );

    return {
      success: finalSuccess,
      status: finalStatus,
      stdout: result.stdout,
      stderr: result.stderr,
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed,
      outputTruncated: result.outputTruncated,
    };
  }
}
export const codeExecutionService = new CodeExecutionService();
