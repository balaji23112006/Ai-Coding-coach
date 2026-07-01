import { ICodeRunner, CodeExecutionResult } from '../../types/execution.types.js';
import { executeProcess } from '../../sandbox/ProcessExecutor.js';

export class TypescriptRunner implements ICodeRunner {
  async run(sourceCode: string, timeoutMs: number): Promise<CodeExecutionResult> {
    try {
      // Execute TypeScript as plain JavaScript (no type checking)
      return await executeProcess({
        command: 'node',
        args: ['--max-old-space-size=128'],
        stdin: sourceCode,
        timeoutMs,
      });
    } catch (err) {
      // Return a structured error result instead of throwing
      return {
        success: false,
        status: 'RUNTIME_ERROR',
        stdout: '',
        stderr: (err as Error).message || 'Execution failed',
        executionTime: 0,
        memoryUsed: 0,
        outputTruncated: false,
      } as any;
    }
  }
}
