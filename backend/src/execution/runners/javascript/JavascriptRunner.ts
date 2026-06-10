import { ICodeRunner, CodeExecutionResult } from '../../types/execution.types.js';
import { executeProcess } from '../../sandbox/ProcessExecutor.js';
import { checkDockerAvailability } from '../../sandbox/DockerDetector.js';

export class JavascriptRunner implements ICodeRunner {
  async run(sourceCode: string, timeoutMs: number): Promise<CodeExecutionResult> {
    const useDocker = checkDockerAvailability();

    if (useDocker) {
      return executeProcess({
        command: 'docker',
        args: ['run', '-i', '--rm', '--memory=128m', '--cpus=0.5', 'node:18-alpine', 'node'],
        stdin: sourceCode,
        timeoutMs,
      });
    } else {
      return executeProcess({
        command: 'node',
        args: ['--max-old-space-size=128'],
        stdin: sourceCode,
        timeoutMs,
      });
    }
  }
}
