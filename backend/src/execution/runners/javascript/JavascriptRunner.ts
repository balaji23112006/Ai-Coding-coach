import { ICodeRunner, CodeExecutionResult } from '../../types/execution.types.js';
import { runWithDockerOrFallback } from '../../sandbox/RemoteDockerExecutor.js';

export class JavascriptRunner implements ICodeRunner {
  async run(sourceCode: string, timeoutMs: number): Promise<CodeExecutionResult> {
    return runWithDockerOrFallback(
      'javascript',
      {
        command: 'docker',
        args: ['run', '-i', '--rm', '--memory=128m', '--cpus=0.5', 'node:22-alpine', 'node'],
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

