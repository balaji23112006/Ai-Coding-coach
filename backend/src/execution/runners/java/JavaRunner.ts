import { ICodeRunner, CodeExecutionResult } from '../../types/execution.types.js';
import { runWithDockerOrFallback } from '../../sandbox/RemoteDockerExecutor.js';

/**
 * Placeholder Java runner.
 * Executes Java source as a script using Node for now (will error for real Java code).
 * In a full implementation, this would compile with `javac` and run with `java`.
 */
export class JavaRunner implements ICodeRunner {
  async run(sourceCode: string, timeoutMs: number): Promise<CodeExecutionResult> {
    // For simplicity, treat Java source as JavaScript – this avoids runtime errors during development.
    return runWithDockerOrFallback(
      'java',
      {
        command: 'docker',
        args: ['run', '-i', '--rm', '--memory=128m', '--cpus=0.5', 'node:18-alpine', 'node'],
        stdin: sourceCode,
        timeoutMs,
      },
      {
        command: 'node',
        args: ['--max-old-space-size=128'],
        stdin: sourceCode,
        timeoutMs,
      },
      timeoutMs
    );
  }
}

