import { ICodeRunner, CodeExecutionResult } from '../../types/execution.types.js';
import { runWithDockerOrFallback } from '../../sandbox/RemoteDockerExecutor.js';

export class PythonRunner implements ICodeRunner {
  async run(sourceCode: string, timeoutMs: number): Promise<CodeExecutionResult> {
    const localCommand = process.platform === 'win32' ? 'python' : 'python3';

    return runWithDockerOrFallback(
      'python',
      {
        command: 'docker',
        args: [
          'run',
          '-i',
          '--rm',
          '--memory=128m',
          '--cpus=0.5',
          'python:3.10-alpine',
          'python',
          '-',
        ],
        stdin: sourceCode,
        timeoutMs,
      },
      {
        command: localCommand,
        args: ['-'],
        stdin: sourceCode,
        timeoutMs,
      },
      timeoutMs
    );
  }
}

