import { ICodeRunner, CodeExecutionResult } from '../../types/execution.types.js';
import { executeProcess } from '../../sandbox/ProcessExecutor.js';
import { checkDockerAvailability } from '../../sandbox/DockerDetector.js';

export class PythonRunner implements ICodeRunner {
  async run(sourceCode: string, timeoutMs: number): Promise<CodeExecutionResult> {
    const useDocker = checkDockerAvailability();

    if (useDocker) {
      return executeProcess({
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
      });
    } else {
      // Use 'python' on Windows host, and 'python3' on Linux/macOS
      const localCommand = process.platform === 'win32' ? 'python' : 'python3';
      return executeProcess({
        command: localCommand,
        args: ['-'],
        stdin: sourceCode,
        timeoutMs,
      });
    }
  }
}
